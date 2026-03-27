package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.blockchain.application.service.BlockchainRequestDispatchService;
import com.ssafy.srank.card.application.service.UserCardService;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.metrics.BusinessExceptionMetrics;
import com.ssafy.srank.common.metrics.GachaMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.probablyfair.application.service.ProbablyFairService;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.gacha.application.dto.request.GachaDrawRequest;
import com.ssafy.srank.gacha.application.dto.request.GachaVerificationRequest;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawCardResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaProofResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaVerificationResponse;
import com.ssafy.srank.gacha.application.service.model.DrawContext;
import com.ssafy.srank.gacha.application.service.model.GachaProofMaterial;
import com.ssafy.srank.gacha.application.service.model.PreparedDraw;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.gacha.domain.policy.GachaPolicyRegistry;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainRequestMessage;
import com.ssafy.srank.rabbitmq.log.message.GachaLogMessage;
import com.ssafy.srank.rabbitmq.log.producer.GachaLogProducer;
import com.ssafy.srank.ranking.application.event.UserCardsChangedEvent;
import com.ssafy.srank.user.application.dto.response.MyGachaInfo;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GachaServiceImpl implements GachaService {

    private static final int MAX_CARD_INVENTORY = 200;

    private final UserService userService;
    private final UserCardService userCardService;
    private final GachaPolicyRegistry gachaPolicyRegistry;
    private final ProbablyFairService probablyFairService;
    private final GachaDrawPreparationService gachaDrawPreparationService;
    private final GachaDigestBuilder gachaDigestBuilder;
    private final GachaDrawLogCommandFactory gachaDrawLogCommandFactory;
    private final GachaLogProducer gachaLogProducer;
    private final GachaMetrics gachaMetrics;
    private final BusinessExceptionMetrics businessExceptionMetrics;
    private final BlockchainRequestDispatchService blockchainRequestDispatchService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public GachaDrawResponse draw(Long userId, GachaDrawRequest request) {
        long startNanos = System.nanoTime();
        String gachaType = MetricTagValues.enumName(request.getType());
        String drawCount = MetricTagValues.number(request.getCount());
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            DrawContext context = buildDrawContext(userId, request);
            gachaType = MetricTagValues.enumName(context.type());
            drawCount = MetricTagValues.number(context.count());

            spendGold(context);

            List<PreparedDraw> preparedDraws = gachaDrawPreparationService.createPreparedDraws(
                    context.userId(),
                    context.type(),
                    context.clientSeed(),
                    context.pfContext(),
                    context.count()
            );
            List<UserCard> savedCards = saveCards(preparedDraws);
            eventPublisher.publishEvent(new UserCardsChangedEvent(userId));

            GachaProofMaterial proofMaterial = gachaDigestBuilder.build(
                    context.type(),
                    context.count(),
                    context.clientSeed(),
                    context.pfContext(),
                    preparedDraws
            );

            recordDrawLog(context, savedCards, preparedDraws, proofMaterial);
            GachaDrawResponse response = buildDrawResponse(context, savedCards);
            gachaMetrics.recordGoldSpent(gachaType, drawCount, context.cost());
            gachaMetrics.recordCardsCreated(gachaType, drawCount, savedCards.size());
            return response;
        } catch (BusinessException e) {
            result = MetricTagValues.RESULT_FAILURE;
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record("gacha.draw", e);
            throw e;
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            gachaMetrics.recordDraw(System.nanoTime() - startNanos, gachaType, drawCount, result, errorCode);
        }
    }

    @Override
    public GachaVerificationResponse verify(GachaVerificationRequest request) {
        int count = validateCount(request.getCount());
        ProbablyFairContext pfContext = new ProbablyFairContext(
                request.getServerSeed().trim(),
                request.getAlgorithmVersion()
        );
        String clientSeed = request.getClientSeed().trim();

        List<PreparedDraw> preparedDraws = gachaDrawPreparationService.createPreparedDraws(
                null,
                request.getType(),
                clientSeed,
                pfContext,
                count
        );
        List<GachaDrawCardResponse> cards = preparedDraws.stream()
                .map(PreparedDraw::userCard)
                .map(UserCard::toResponse)
                .map(GachaDrawCardResponse::from)
                .toList();

        return new GachaVerificationResponse(
                cards,
                new GachaProofResponse(
                        pfContext.algorithmVersion(),
                        pfContext.serverSeed(),
                        clientSeed
                )
        );
    }

    private DrawContext buildDrawContext(Long userId, GachaDrawRequest request) {
        GachaType type = request.getType();
        int count = validateCount(request.getCount());
        String clientSeed = request.getClientSeed().trim();
        ProbablyFairContext pfContext = probablyFairService.issueContext();
        LocalDateTime requestedAt = LocalDateTime.now();

        MyGachaInfo myGachaInfo = userService.getMyGachaInfo(userId);
        gachaPolicyRegistry.validateUnlocked(type, myGachaInfo.getLevel());

        long currentCardCount = userCardService.countActiveCards(userId);
        if (currentCardCount + count > MAX_CARD_INVENTORY) {
            throw new BusinessException(ErrorCode.GACHA_INVENTORY_FULL);
        }

        long cost = gachaPolicyRegistry.calculateCost(type, count);
        if (myGachaInfo.getGold() < cost) {
            throw new BusinessException(ErrorCode.GACHA_GOLD_INSUFFICIENT);
        }

        String walletAddress = userService.getWalletAddress(userId);
        return new DrawContext(
                userId,
                walletAddress,
                type,
                count,
                clientSeed,
                pfContext,
                cost,
                requestedAt
        );
    }

    private void spendGold(DrawContext context) {
        userService.spendGold(context.userId(), context.cost(), GoldLogReason.GACHA_SPEND);
    }

    private List<UserCard> saveCards(List<PreparedDraw> preparedDraws) {
        return userCardService.saveUserCards(preparedDraws.stream()
                .map(PreparedDraw::userCard)
                .toList());
    }

    private void recordDrawLog(
            DrawContext context,
            List<UserCard> savedCards,
            List<PreparedDraw> preparedDraws,
            GachaProofMaterial proofMaterial
    ) {
        var logCommand = gachaDrawLogCommandFactory.create(
                context.userId(),
                context.type(),
                context.count(),
                context.cost(),
                context.clientSeed(),
                context.pfContext(),
                proofMaterial.anchorPayload(),
                savedCards,
                preparedDraws,
                context.requestedAt()
        );

        logCommand.drawnCards().forEach(card -> gachaLogProducer.sendGachaLogMessage(new GachaLogMessage(
                logCommand.userId(),
                logCommand.gachaType(),
                logCommand.drawCount(),
                card.drawIndex(),
                card.userCardId(),
                card.templateId(),
                card.grade(),
                card.gradeRoll(),
                card.templateRoll(),
                card.skillRoll(),
                Math.toIntExact(logCommand.totalCost()),
                logCommand.tutorial(),
                card.skillType1(),
                card.skillValue1(),
                card.skillType2(),
                card.skillValue2(),
                card.skillType3(),
                card.skillValue3(),
                card.specialSkillCode(),
                logCommand.clientSeed(),
                logCommand.serverSeed(),
                logCommand.algorithmVersion(),
                logCommand.anchorPayload(),
                BlockchainStatus.NOT_REQUESTED,
                null,
                logCommand.createdAt()
        )));

        blockchainRequestDispatchService.dispatchAfterCommit(BlockchainRequestMessage.forGacha(
                context.walletAddress(),
                context.clientSeed(),
                context.pfContext().serverSeed(),
                context.count(),
                context.type()
        ));
    }

    private GachaDrawResponse buildDrawResponse(DrawContext context, List<UserCard> savedCards) {
        List<GachaDrawCardResponse> cards = savedCards.stream()
                .map(UserCard::toResponse)
                .map(GachaDrawCardResponse::from)
                .toList();

        return new GachaDrawResponse(
                cards,
                userService.getMyGachaInfo(context.userId()).getGold(),
                new GachaProofResponse(
                        context.pfContext().algorithmVersion(),
                        context.pfContext().serverSeed(),
                        context.clientSeed()
                )
        );
    }

    private int validateCount(Integer count) {
        if (count == null || (count != 1 && count != 10)) {
            throw new BusinessException(ErrorCode.GACHA_INVALID_COUNT);
        }
        return count;
    }
}
