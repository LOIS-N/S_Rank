package com.ssafy.srank.card.application.service;

import com.ssafy.srank.card.application.dto.request.DeleteCardRequest;
import com.ssafy.srank.card.application.dto.response.CardSkillResponse;
import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.SpecialAbilityResponse;
import com.ssafy.srank.card.application.dto.response.SpecialSkillEffectResponse;
import com.ssafy.srank.card.application.dto.response.UserCardCursor;
import com.ssafy.srank.card.application.dto.response.UserCardFlatResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.domain.entity.SpecialSkillTemplate;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.MarketStatus;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;
import com.ssafy.srank.card.repository.SpecialSkillTemplateRepository;
import com.ssafy.srank.card.repository.UserCardQueryRepository;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.metrics.BusinessExceptionMetrics;
import com.ssafy.srank.common.metrics.CardMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.market.application.dto.response.SellableCardResponse;
import com.ssafy.srank.market.application.dto.response.SkillResponse;
import com.ssafy.srank.quest.application.service.UserQuestCardService;
import com.ssafy.srank.ranking.application.event.UserCardsChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserCardServiceImpl implements UserCardService {

    private static final int DEFAULT_LIMIT = 30;

    private final UserCardQueryRepository userCardQueryRepository;
    private final UserCardRepository userCardRepository;
    private final SpecialSkillTemplateRepository specialSkillTemplateRepository;
    private final UserQuestCardService userQuestCardService;
    private final ApplicationEventPublisher eventPublisher;
    private final CardMetrics cardMetrics;
    private final BusinessExceptionMetrics businessExceptionMetrics;

    @Transactional(readOnly = true)
    @Override
    public CursorPageResponse<UserCardResponse> getUserCards(
            Long userId,
            PositionType statType,
            SortType sortType,
            String cursorToken,
            int limit,
            boolean isEnhance
    ) {
        UserCardCursor cursor = decodeCursor(cursorToken);
        int fetchLimit = (limit <= 0) ? DEFAULT_LIMIT : limit;

        List<UserCardFlatResponse> rows = userCardQueryRepository.findUserCards(
                userId, statType, sortType, cursor, fetchLimit
        );

        boolean hasMore = rows.size() > fetchLimit;
        List<UserCardFlatResponse> page = hasMore ? rows.subList(0, fetchLimit) : rows;

        Set<Long> skillIds = page.stream()
                .map(UserCardFlatResponse::specialSkillTemplateId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        Map<Long, SpecialAbilityResponse> specialAbilityMap = specialSkillTemplateRepository.findAllById(skillIds)
                .stream()
                .collect(Collectors.toMap(SpecialSkillTemplate::getId, this::toSpecialAbilityResponse));

        List<UserCardResponse> cards = page.stream()
                .map(flat -> flat.toResponse(
                        flat.specialSkillTemplateId() != null
                                ? specialAbilityMap.get(flat.specialSkillTemplateId())
                                : null
                ))
                .toList();

        String nextCursor = hasMore ? encodeCursor(page.get(page.size() - 1)) : null;
        int totalCnt = isEnhance
                ? userCardRepository.countByUserIdAndIsDeletedFalseAndEnhanceTryCountLessThan(userId, 7)
                : userCardRepository.countByUserIdAndIsDeletedFalse(userId);

        return new CursorPageResponse<>(cards, nextCursor, hasMore, totalCnt);
    }

    @Override
    public List<SellableCardResponse> getSellableUserCard(Long userId) {
        List<UserCard> cards =
                userCardRepository.findByUserIdAndMarketStatusAndIsDeletedFalse(userId, MarketStatus.OWNED);

        LocalDateTime now = LocalDateTime.now();

        return cards.stream()
                .map(card -> new SellableCardResponse(
                        card.getId(),
                        card.getCardTemplate().getId(),
                        card.getCardTemplate().getCharacterName(),
                        card.getCardTemplate().getFrameImageUrl(),
                        new SkillResponse(card.getStat1().getSkillType().name(), card.getStat1().getBaseValue(), card.getStat1().getBonusValue()),
                        new SkillResponse(card.getStat2().getSkillType().name(), card.getStat2().getBaseValue(), card.getStat2().getBonusValue()),
                        new SkillResponse(card.getStat3().getSkillType().name(), card.getStat3().getBaseValue(), card.getStat3().getBonusValue()),
                        card.getSpecialSkillTemplate() == null ? null : card.getSpecialSkillTemplate().getSkillName(),
                        card.getEnhanceTryCount(),
                        card.getEnhanceSuccessCount(),
                        card.getCardTemplate().getGrade().toString(),
                        card.getCreatedAt(),
                        now.plusHours(24)
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    @Override
    public UserCardResponse getUserCardDetail(Long userId, Long cardId) {
        return userCardRepository.findByIdAndUserIdAndIsDeletedFalse(cardId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND))
                .toResponse();
    }

    @Transactional(readOnly = true)
    @Override
    public UserCard getUserCardEntity(Long cardId) {
        return userCardRepository.findById(cardId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND));
    }

    @Override
    public void validateCardsOwned(Long userId, List<Long> cards) {
        long count = userCardRepository.countByIdInAndUserId(cards, userId);
        if (count != cards.size()) {
            throw new BusinessException(ErrorCode.CARD_NOT_FOUND);
        }
    }

    @Override
    public long countActiveCards(Long userId) {
        return userCardRepository.countActiveByUserId(userId);
    }

    @Override
    public List<UserCard> saveUserCards(List<UserCard> userCards) {
        return userCardRepository.saveAll(userCards);
    }

    @Override
    public void applyEnhanceSuccess(Long userId, Long cardId, int value1, int value2, int value3) {
        UserCard userCard = userCardRepository.findByIdAndUserIdAndIsDeletedFalse(cardId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND));
        userCard.applyEnhanceSuccess(value1, value2, value3);
    }

    @Override
    public void applyEnhanceFail(Long userId, Long cardId) {
        UserCard userCard = userCardRepository.findByIdAndUserIdAndIsDeletedFalse(cardId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND));
        userCard.applyEnhanceFail();
    }

    @Transactional
    @Override
    public void deleteCard(Long userId, DeleteCardRequest request) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            Set<Long> usedSet = new HashSet<>(userQuestCardService.getUsedCardList(userId));
            boolean hasUsedCard = request.cards().stream().anyMatch(usedSet::contains);
            if (hasUsedCard) {
                throw new BusinessException(ErrorCode.CARD_IN_USE_CANNOT_DELETE);
            }

            List<UserCard> cardList = userCardRepository.findAllActiveByUserIdAndIdInForUpdate(userId, request.cards());
            cardList.forEach(card -> card.softDelete(LocalDateTime.now()));
            cardMetrics.recordDeletedCards(cardList.size());
            eventPublisher.publishEvent(new UserCardsChangedEvent(userId));
        } catch (BusinessException e) {
            result = MetricTagValues.RESULT_FAILURE;
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record("card.delete", e);
            throw e;
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            cardMetrics.recordDelete(System.nanoTime() - startNanos, result, errorCode);
        }
    }

    private SpecialAbilityResponse toSpecialAbilityResponse(SpecialSkillTemplate template) {
        List<SpecialSkillEffectResponse> effects = template.getEffects().stream()
                .map(e -> new SpecialSkillEffectResponse(
                        e.getEffectType(),
                        e.getEffectOperator(),
                        e.getEffectAmount(),
                        e.getTargetScope(),
                        e.getTargetPosition(),
                        e.getConditionType(),
                        e.getConditionValue(),
                        e.getConditionPosition(),
                        e.getPriority()
                ))
                .toList();
        return new SpecialAbilityResponse(template.getSkillName(), template.getDescription(), effects);
    }

    @Transactional
    @Override
    public void changeMarketStatus(Long userId, Long cardId, MarketStatus status) {
        UserCard card = userCardRepository.findByIdAndUserIdAndIsDeletedFalse(cardId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND));
        card.changeMarketStatus(status);
    }

    private String encodeCursor(UserCardFlatResponse last) {
        int gradePriority = toGradePriority(last.grade());
        int totalStat = last.skillValue1() + last.skillValue2() + last.skillValue3();
        String raw = gradePriority + ":" + totalStat + ":" + last.cardId();
        return Base64.getEncoder().encodeToString(raw.getBytes());
    }

    private UserCardCursor decodeCursor(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            String raw = new String(Base64.getDecoder().decode(token));
            String[] parts = raw.split(":");
            int grade = Integer.parseInt(parts[0]);
            int totalStat = Integer.parseInt(parts[1]);
            long cardId = Long.parseLong(parts[2]);
            return new UserCardCursor(grade, totalStat, cardId);
        } catch (Exception e) {
            return null;
        }
    }

    private int toGradePriority(String grade) {
        return switch (grade) {
            case "S" -> 5;
            case "A" -> 4;
            case "B" -> 3;
            case "C" -> 2;
            default -> 1;
        };
    }
}
