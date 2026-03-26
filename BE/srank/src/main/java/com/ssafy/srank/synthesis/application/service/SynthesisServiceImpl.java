package com.ssafy.srank.synthesis.application.service;

import com.ssafy.srank.blockchain.application.service.BlockchainRequestDispatchService;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.cardcreation.CardCreationCommand;
import com.ssafy.srank.common.cardcreation.CardCreationPurpose;
import com.ssafy.srank.common.cardcreation.CardCreationRandomSource;
import com.ssafy.srank.common.cardcreation.CardCreationService;
import com.ssafy.srank.common.cardcreation.CreatedCardDraft;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.metrics.BusinessExceptionMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.SynthesisMetrics;
import com.ssafy.srank.common.probablyfair.application.service.ProbablyFairService;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairPurpose;
import com.ssafy.srank.log.application.facade.EconomyLogFacade;
import com.ssafy.srank.log.application.facade.SynthesisLogFacade;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.quest.application.service.UserQuestCardService;
import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainRequestMessage;
import com.ssafy.srank.rabbitmq.log.message.GoldLogMessage;
import com.ssafy.srank.rabbitmq.log.producer.GoldLogProducer;
import com.ssafy.srank.ranking.application.event.UserCardsChangedEvent;
import com.ssafy.srank.synthesis.application.dto.request.SynthesisAttemptRequest;
import com.ssafy.srank.synthesis.application.dto.request.SynthesisVerificationRequest;
import com.ssafy.srank.synthesis.application.dto.response.SynthesisAttemptResponse;
import com.ssafy.srank.synthesis.application.dto.response.SynthesisVerificationResponse;
import com.ssafy.srank.synthesis.application.factory.SynthesisLogCommandFactory;
import com.ssafy.srank.synthesis.application.helper.SynthesisProofHelper;
import com.ssafy.srank.synthesis.config.SynthesisProperties;
import com.ssafy.srank.synthesis.domain.policy.SynthesisPolicyVersion;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import jakarta.persistence.LockTimeoutException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SynthesisServiceImpl implements SynthesisService {

    private static final int SUCCESS_BOUND = 100;

    private final UserRepository userRepository;
    private final UserCardRepository userCardRepository;
    private final UserQuestCardService userQuestCardService;
    private final CardCreationService cardCreationService;
    private final ProbablyFairService probablyFairService;
    private final SynthesisProperties synthesisProperties;
    private final SynthesisProofHelper synthesisProofHelper;
    private final EconomyLogFacade economyLogFacade;
    private final SynthesisLogFacade synthesisLogFacade;
    private final SynthesisLogCommandFactory synthesisLogCommandFactory;
    private final SynthesisMetrics synthesisMetrics;
    private final BusinessExceptionMetrics businessExceptionMetrics;
    private final BlockchainRequestDispatchService blockchainRequestDispatchService;
    private final ApplicationEventPublisher eventPublisher;
    private final GoldLogProducer goldProducer;

    @Override
    @Transactional
    public SynthesisAttemptResponse attempt(Long userId, SynthesisAttemptRequest request) {
        long startNanos = System.nanoTime();
        String sourceGradeTag = MetricTagValues.VALUE_UNKNOWN;
        String cardCountTag = MetricTagValues.VALUE_UNKNOWN;
        String result = MetricTagValues.RESULT_FAILURE;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            List<Long> cardIds = validateDistinctCardIds(request.getCardIds());
            cardCountTag = MetricTagValues.number(cardIds.size());
            String clientSeed = request.getClientSeed().trim();

            User user = getLockedActiveUser(userId);
            List<UserCard> sourceCards = loadLockedSourceCards(userId, cardIds);
            userQuestCardService.validateCardsAvailable(userId, cardIds);

            CardGrade sourceGrade = validateSourceGrade(sourceCards);
            sourceGradeTag = MetricTagValues.enumName(sourceGrade);
            synthesisProperties.validateCardCount(sourceGrade, cardIds.size());

            int costGold = synthesisProperties.getCostGold(sourceGrade);
            if (user.getGold() < costGold) {
                throw new BusinessException(ErrorCode.SYNTHESIS_GOLD_INSUFFICIENT);
            }

            LocalDateTime now = LocalDateTime.now();
            user.decreaseGold((long) costGold);
            goldProducer.sendGoldLogMessage(new GoldLogMessage(
                    userId,
                    -costGold,
                    user.getGold(),
                    GoldLogReason.SYNTHESIS_SPEND,
                    now
            ));

            ProbablyFairContext context = probablyFairService.issueContext();
            int resultRoll = rollResult(clientSeed, context);
            boolean success = isSuccess(sourceGrade, cardIds.size(), resultRoll);
            result = success ? MetricTagValues.RESULT_SUCCESS : MetricTagValues.RESULT_FAILURE;
            CardGrade resultGrade = success ? synthesisProperties.getSuccessGrade(sourceGrade) : sourceGrade;

            sourceCards.forEach(card -> card.consumeForSynthesis(now));

            CreatedCardDraft createdCard = createResultCard(userId, resultGrade, clientSeed, context);
            UserCard savedResultCard = userCardRepository.save(createdCard.userCard());
            eventPublisher.publishEvent(new UserCardsChangedEvent(userId));

            String resultDigest = synthesisProofHelper.buildResultDigest(
                    sourceGrade,
                    cardIds.size(),
                    resultGrade,
                    savedResultCard
            );

            Long synthesisLogId = synthesisLogFacade.record(synthesisLogCommandFactory.create(
                    userId,
                    cardIds,
                    savedResultCard,
                    success,
                    costGold,
                    sourceGrade,
                    clientSeed,
                    context.serverSeed(),
                    context.algorithmVersion(),
                    SynthesisPolicyVersion.currentValue(),
                    resultRoll,
                    resultDigest,
                    now
            ));

            blockchainRequestDispatchService.dispatchAfterCommit(BlockchainRequestMessage.forSynthesis(
                    synthesisLogId,
                    user.getWalletAddress(),
                    cardIds
            ));

            log.info("synthesis completed userId={} sourceGrade={} cardCount={} success={}", userId, sourceGrade, cardIds.size(), success);

            return SynthesisAttemptResponse.of(
                    success,
                    sourceGrade.name(),
                    resultGrade.name(),
                    toResponse(savedResultCard),
                    user.getGold(),
                    synthesisProofHelper.createProof(context, clientSeed)
            );
        } catch (BusinessException e) {
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record("synthesis.attempt", e);
            throw e;
        } catch (RuntimeException e) {
            if (isLockConflict(e)) {
                synthesisMetrics.recordLockConflict(sourceGradeTag);
                errorCode = ErrorCode.SYNTHESIS_VRF_FAILED.getCode();
                throw new BusinessException(ErrorCode.SYNTHESIS_VRF_FAILED);
            }

            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            synthesisMetrics.recordAttempt(System.nanoTime() - startNanos, sourceGradeTag, cardCountTag, result, errorCode);
        }
    }

    @Override
    public SynthesisVerificationResponse verify(SynthesisVerificationRequest request) {
        String clientSeed = request.getClientSeed().trim();
        synthesisProperties.validateCardCount(request.getSourceGrade(), request.getCardCount());

        ProbablyFairContext context = new ProbablyFairContext(
                request.getServerSeed().trim(),
                request.getAlgorithmVersion()
        );

        int resultRoll = rollResult(clientSeed, context);
        boolean success = isSuccess(request.getSourceGrade(), request.getCardCount(), resultRoll);
        CardGrade resultGrade = success ? synthesisProperties.getSuccessGrade(request.getSourceGrade()) : request.getSourceGrade();

        CreatedCardDraft createdCard = createResultCard(null, resultGrade, clientSeed, context);
        synthesisProofHelper.buildResultDigest(
                request.getSourceGrade(),
                request.getCardCount(),
                resultGrade,
                createdCard.userCard()
        );

        return SynthesisVerificationResponse.of(
                success,
                request.getSourceGrade().name(),
                resultGrade.name(),
                toResponse(createdCard.userCard()),
                synthesisProofHelper.createProof(
                        request.getAlgorithmVersion(),
                        request.getServerSeed().trim(),
                        clientSeed
                )
        );
    }

    private List<Long> validateDistinctCardIds(List<Long> cardIds) {
        List<Long> requested = new ArrayList<>(cardIds);
        if (requested.size() != new LinkedHashSet<>(requested).size()) {
            throw new BusinessException(ErrorCode.SYNTHESIS_SAME_CARD_DUPLICATE);
        }
        return requested;
    }

    private User getLockedActiveUser(Long userId) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isWithdrawn()) {
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }
        return user;
    }

    private List<UserCard> loadLockedSourceCards(Long userId, List<Long> cardIds) {
        Map<Long, UserCard> cardsById = userCardRepository.findAllActiveByUserIdAndIdInForUpdate(userId, cardIds)
                .stream()
                .collect(Collectors.toMap(UserCard::getId, Function.identity()));

        if (cardsById.size() != cardIds.size()) {
            throw new BusinessException(ErrorCode.CARD_NOT_FOUND);
        }

        return cardIds.stream()
                .sorted()
                .map(cardsById::get)
                .toList();
    }

    private CardGrade validateSourceGrade(List<UserCard> sourceCards) {
        CardGrade sourceGrade = sourceCards.get(0).getCardTemplate().getGrade();
        boolean mismatched = sourceCards.stream()
                .map(card -> card.getCardTemplate().getGrade())
                .anyMatch(grade -> grade != sourceGrade);

        if (mismatched) {
            throw new BusinessException(ErrorCode.SYNTHESIS_GRADE_MISMATCH);
        }

        return sourceGrade;
    }

    private int rollResult(String clientSeed, ProbablyFairContext context) {
        return probablyFairService.roll(
                context,
                clientSeed,
                0,
                () -> "SYNTHESIS_RESULT",
                SUCCESS_BOUND
        );
    }

    private boolean isSuccess(CardGrade sourceGrade, int cardCount, int resultRoll) {
        int successRate = synthesisProperties.getSuccessRate(sourceGrade, cardCount);
        return resultRoll < successRate;
    }

    private CreatedCardDraft createResultCard(
            Long userId,
            CardGrade resultGrade,
            String clientSeed,
            ProbablyFairContext context
    ) {
        return cardCreationService.create(
                new CardCreationCommand(userId, resultGrade),
                createRandomSource(resultGrade, clientSeed, context)
        );
    }

    private CardCreationRandomSource createRandomSource(
            CardGrade grade,
            String clientSeed,
            ProbablyFairContext context
    ) {
        return (purpose, bound) -> probablyFairService.roll(
                context,
                clientSeed,
                0,
                mapPurpose(grade, purpose),
                bound
        );
    }

    // 카드 생성 roll purpose를 합성 전용 namespace로 바꿔서 추후 분석 시 섞이지 않게 한다.
    private ProbablyFairPurpose mapPurpose(CardGrade grade, String purpose) {
        if (purpose.equals(CardCreationPurpose.template(grade))) {
            return ProbablyFairPurpose.of("SYNTHESIS_TEMPLATE_" + grade.name());
        }
        if (purpose.equals(CardCreationPurpose.specialSkillGranted())) {
            return ProbablyFairPurpose.of("SYNTHESIS_SPECIAL_SKILL_GRANTED");
        }
        if (purpose.equals(CardCreationPurpose.specialSkill())) {
            return ProbablyFairPurpose.of("SYNTHESIS_SKILL");
        }
        if (purpose.startsWith("POSITION_")) {
            int index = Integer.parseInt(purpose.substring("POSITION_".length()));
            return ProbablyFairPurpose.of("SYNTHESIS_POSITION_" + index);
        }
        if (purpose.startsWith("STAT_")) {
            int index = Integer.parseInt(purpose.substring("STAT_".length()));
            return ProbablyFairPurpose.of("SYNTHESIS_STAT_" + index);
        }
        return ProbablyFairPurpose.of(purpose);
    }

    private boolean isLockConflict(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof CannotAcquireLockException
                    || current instanceof PessimisticLockingFailureException
                    || current instanceof QueryTimeoutException
                    || current instanceof LockTimeoutException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private UserCardResponse toResponse(UserCard userCard) {
        return userCard.toResponse();
    }
}
