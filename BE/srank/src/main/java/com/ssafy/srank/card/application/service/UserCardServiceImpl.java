package com.ssafy.srank.card.application.service;

import com.ssafy.srank.card.application.dto.response.*;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.entity.SpecialSkillTemplate;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;
import com.ssafy.srank.card.repository.SpecialSkillTemplateRepository;
import com.ssafy.srank.card.repository.UserCardQueryRepository;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.application.service.QuestFacadeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserCardServiceImpl implements UserCardService {

    private static final int DEFAULT_LIMIT = 30;

    private final UserCardQueryRepository userCardQueryRepository;
    private final UserCardRepository userCardRepository;
    private final SpecialSkillTemplateRepository specialSkillTemplateRepository;
    private final QuestFacadeService questFacadeService;

    @Transactional(readOnly = true)
    @Override
    public CursorPageResponse<UserCardResponse> getUserCards(
            Long userId,
            PositionType statType,
            SortType sortType,
            String cursorToken,
            int limit
    ) {
        UserCardCursor cursor = decodeCursor(cursorToken);
        int fetchLimit = (limit <= 0) ? DEFAULT_LIMIT : limit;

        List<UserCardFlatResponse> rows = userCardQueryRepository.findUserCards(
                userId, statType, sortType, cursor, fetchLimit
        );

        boolean hasMore = rows.size() > fetchLimit;
        List<UserCardFlatResponse> page = hasMore ? rows.subList(0, fetchLimit) : rows;

        // specialSkillTemplateId 모아서 한 번에 조회
        Set<Long> skillIds = page.stream()
                .map(UserCardFlatResponse::specialSkillTemplateId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        Map<Long, SpecialAbilityResponse> specialAbilityMap = specialSkillTemplateRepository
                .findAllById(skillIds).stream()
                .collect(Collectors.toMap(
                        SpecialSkillTemplate::getId,
                        this::toSpecialAbilityResponse
                ));

        List<UserCardResponse> cards = page.stream()
                .map(flat -> flat.toResponse(
                        flat.specialSkillTemplateId() != null
                                ? specialAbilityMap.get(flat.specialSkillTemplateId())
                                : null
                ))
                .toList();

        String nextCursor = hasMore ? encodeCursor(page.get(page.size() - 1)) : null;

        return new CursorPageResponse<>(cards, nextCursor, hasMore);
    }

    @Transactional(readOnly = true)
    @Override
    public UserCardResponse getUserCardDetail(Long userId, Long cardId) {
        return userCardRepository.findByIdAndUserId(cardId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND))
                .toResponse();
    }

    @Override
    public Set<Long> getUsedUserCardList(Long userId) {
        return questFacadeService.getUsedUserCardList(userId);
    }

    @Override
    public long countActiveCards(Long userId) {
        return userCardRepository.countActiveByUserId(userId);
    }

    @Override
    public List<UserCard> saveUserCards(List<UserCard> userCards) {
        return userCardRepository.saveAll(userCards);
    }

    // ── specialAbility 변환 ───────────────────────────────────────────────────

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
        return new SpecialAbilityResponse(
                template.getSkillName(),
                template.getDescription(),
                effects
        );
    }

    // ── cursor 인코딩/디코딩 ──────────────────────────────────────────────────

    private String encodeCursor(UserCardFlatResponse last) {
        int gradePriority = toGradePriority(last.grade());
        int totalStat = last.skillValue1() + last.skillValue2() + last.skillValue3();
        String raw = gradePriority + ":" + totalStat + ":" + last.cardId();
        return Base64.getEncoder().encodeToString(raw.getBytes());
    }

    private UserCardCursor decodeCursor(String token) {
        if (token == null || token.isBlank()) return null;
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
