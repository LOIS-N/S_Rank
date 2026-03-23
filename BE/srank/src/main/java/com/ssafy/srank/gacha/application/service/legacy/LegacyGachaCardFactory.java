package com.ssafy.srank.gacha.application.service.legacy;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.entity.SkillStat;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.repository.CardTemplateRepository;
import com.ssafy.srank.gacha.domain.policy.FlyerGachaPolicy;
import com.ssafy.srank.gacha.domain.policy.GachaRandomProvider;
import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 현재 요청 경로에서는 사용하지 않는 예전 RNG 기반 가챠 생성 로직을 격리해 둔 팩토리다.
 */
@Deprecated(forRemoval = false)
@RequiredArgsConstructor
public class LegacyGachaCardFactory {

    private final CardTemplateRepository cardTemplateRepository;
    private final FlyerGachaPolicy flyerGachaPolicy;
    private final GachaRandomProvider gachaRandomProvider;

    public UserCard createLegacyDrawnCard(Long userId) {
        CardGrade grade = flyerGachaPolicy.selectGrade(gachaRandomProvider.nextDouble());
        CardTemplate template = selectLegacyTemplate(grade);

        List<PositionType> positions = pickLegacyDistinctPositions(3);
        int minStat = flyerGachaPolicy.minStat(grade);
        int maxStat = flyerGachaPolicy.maxStat(grade);

        return UserCard.builder()
                .userId(userId)
                .cardTemplate(template)
                .specialSkillTemplate(null)
                .stat1(new SkillStat(positions.get(0), legacyStatValue(minStat, maxStat), 0))
                .stat2(new SkillStat(positions.get(1), legacyStatValue(minStat, maxStat), 0))
                .stat3(new SkillStat(positions.get(2), legacyStatValue(minStat, maxStat), 0))
                .enhanceTryCount(0)
                .enhanceSuccessCount(0)
                .build();
    }

    private CardTemplate selectLegacyTemplate(CardGrade grade) {
        List<CardTemplate> candidates = cardTemplateRepository
                .findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalse(grade);

        if (candidates.isEmpty()) {
            throw new IllegalStateException("No drawable card template for grade " + grade);
        }

        return candidates.get(gachaRandomProvider.nextInt(candidates.size()));
    }

    private List<PositionType> pickLegacyDistinctPositions(int count) {
        List<PositionType> candidates = new ArrayList<>(Arrays.asList(PositionType.values()));
        List<PositionType> selected = new ArrayList<>(count);

        for (int i = 0; i < count; i++) {
            int index = gachaRandomProvider.nextInt(candidates.size());
            selected.add(candidates.remove(index));
        }

        return selected;
    }

    private int legacyStatValue(int min, int max) {
        return min + gachaRandomProvider.nextInt(max - min + 1);
    }
}
