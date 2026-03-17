package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.entity.SkillStat;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.repository.CardTemplateRepository;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.gacha.application.dto.request.GachaDrawRequest;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawCardResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawResponse;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.gacha.domain.policy.FlyerGachaPolicy;
import com.ssafy.srank.gacha.domain.policy.GachaRandomProvider;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GachaServiceImpl implements GachaService {

    private static final int MAX_CARD_INVENTORY = 200;

    private final UserRepository userRepository;
    private final UserCardRepository userCardRepository;
    private final CardTemplateRepository cardTemplateRepository;
    private final FlyerGachaPolicy flyerGachaPolicy;
    private final GachaRandomProvider gachaRandomProvider;

    @Override
    @Transactional
    public GachaDrawResponse draw(Long userId, GachaDrawRequest request) {
        GachaType type = parseType(request.getType());
        int count = validateCount(request.getCount());

        if (type != GachaType.FLYER) {
            throw new BusinessException(ErrorCode.GACHA_TYPE_LOCKED);
        }

        long currentCardCount = userCardRepository.countActiveByUserId(userId);
        if (currentCardCount + count > MAX_CARD_INVENTORY) {
            throw new BusinessException(ErrorCode.GACHA_INVENTORY_FULL);
        }

        long cost = flyerGachaPolicy.calculateCost(count);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.getGold() < cost) {
            throw new BusinessException(ErrorCode.GACHA_GOLD_INSUFFICIENT);
        }

        user.spendGold(cost);

        List<UserCard> drawnCards = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            drawnCards.add(createDrawnCard(userId));
        }

        List<GachaDrawCardResponse> cards = userCardRepository.saveAll(drawnCards).stream()
                .map(UserCard::toResponse)
                .map(GachaDrawCardResponse::from)
                .toList();

        return new GachaDrawResponse(type.name(), count, cost, user.getGold(), cards);
    }

    private GachaType parseType(String rawType) {
        try {
            return GachaType.valueOf(rawType.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.GACHA_TYPE_INVALID);
        }
    }

    private int validateCount(Integer count) {
        if (count == null || (count != 1 && count != 10)) {
            throw new BusinessException(ErrorCode.GACHA_INVALID_COUNT);
        }
        return count;
    }

    private UserCard createDrawnCard(Long userId) {
        CardGrade grade = flyerGachaPolicy.selectGrade(gachaRandomProvider.nextDouble());
        CardTemplate template = selectTemplate(grade);

        List<PositionType> positions = pickDistinctPositions(3);
        int minStat = flyerGachaPolicy.minStat(grade);
        int maxStat = flyerGachaPolicy.maxStat(grade);

        return UserCard.builder()
                .userId(userId)
                .cardTemplate(template)
                .specialSkillTemplate(null)
                .stat1(new SkillStat(positions.get(0), nextStatValue(minStat, maxStat), 0))
                .stat2(new SkillStat(positions.get(1), nextStatValue(minStat, maxStat), 0))
                .stat3(new SkillStat(positions.get(2), nextStatValue(minStat, maxStat), 0))
                .enhanceTryCount(0)
                .enhanceSuccessCount(0)
                .build();
    }

    private CardTemplate selectTemplate(CardGrade grade) {
        List<CardTemplate> candidates = cardTemplateRepository
                .findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalse(grade);

        if (candidates.isEmpty()) {
            throw new IllegalStateException("No drawable card template for grade " + grade);
        }

        return candidates.get(gachaRandomProvider.nextInt(candidates.size()));
    }

    private List<PositionType> pickDistinctPositions(int count) {
        List<PositionType> candidates = new ArrayList<>(Arrays.asList(PositionType.values()));
        List<PositionType> selected = new ArrayList<>(count);

        for (int i = 0; i < count; i++) {
            int index = gachaRandomProvider.nextInt(candidates.size());
            selected.add(candidates.remove(index));
        }

        return selected;
    }

    private int nextStatValue(int min, int max) {
        return min + gachaRandomProvider.nextInt(max - min + 1);
    }
}
