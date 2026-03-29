package com.ssafy.srank.card.application.service;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.entity.SkillStat;
import com.ssafy.srank.card.domain.entity.SpecialSkillEffect;
import com.ssafy.srank.card.domain.entity.SpecialSkillTemplate;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.domain.enums.ConditionType;
import com.ssafy.srank.card.domain.enums.MarketStatus;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.repository.CardTemplateRepository;
import com.ssafy.srank.card.repository.SpecialSkillTemplateRepository;
import com.ssafy.srank.common.cardcreation.CardCreationCommand;
import com.ssafy.srank.common.cardcreation.CardCreationMetadata;
import com.ssafy.srank.common.cardcreation.CardCreationPurpose;
import com.ssafy.srank.common.cardcreation.CardCreationRandomSource;
import com.ssafy.srank.common.cardcreation.CardCreationService;
import com.ssafy.srank.common.cardcreation.CreatedCardDraft;
import com.ssafy.srank.gacha.domain.policy.GachaPolicyRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CardCreationServiceImpl implements CardCreationService {

    private final CardTemplateRepository cardTemplateRepository;
    private final SpecialSkillTemplateRepository specialSkillTemplateRepository;
    private final GachaPolicyRegistry gachaPolicyRegistry;

    @Override
    public CreatedCardDraft create(CardCreationCommand command, CardCreationRandomSource randomSource) {
        CardGrade grade = command.grade();
        TemplateSelection templateSelection = selectTemplate(grade, randomSource);
        List<PositionType> positions = pickDistinctPositions(randomSource);
        SpecialSkillSelection skillSelection = selectSpecialSkill(grade, randomSource);
        int minStat = gachaPolicyRegistry.minStat(grade);
        int maxStat = gachaPolicyRegistry.maxStat(grade);

        UserCard userCard = UserCard.builder()
                .userId(command.userId())
                .cardTemplate(templateSelection.template())
                .specialSkillTemplate(skillSelection.specialSkillTemplate())
                .stat1(new SkillStat(positions.get(0), nextStatValue(randomSource, 1, minStat, maxStat), 0))
                .stat2(new SkillStat(positions.get(1), nextStatValue(randomSource, 2, minStat, maxStat), 0))
                .stat3(new SkillStat(positions.get(2), nextStatValue(randomSource, 3, minStat, maxStat), 0))
                .enhanceTryCount(0)
                .enhanceSuccessCount(0)
                .marketStatus(MarketStatus.OWNED)
                .build();

        return new CreatedCardDraft(
                userCard,
                new CardCreationMetadata(
                        templateSelection.templateRoll(),
                        skillSelection.skillRoll(),
                        templateSelection.template().getId(),
                        skillSelection.specialSkillTemplate() == null
                                ? null
                                : skillSelection.specialSkillTemplate().getSkillCode()
                )
        );
    }

    /**
     * 확정된 등급 안에서 템플릿 하나를 선택한다.
     */
    private TemplateSelection selectTemplate(CardGrade grade, CardCreationRandomSource randomSource) {
        List<CardTemplate> candidates = cardTemplateRepository
                .findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalseOrderByIdAsc(grade);

        if (candidates.isEmpty()) {
            throw new IllegalStateException("No drawable card template for grade " + grade);
        }

        int templateRoll = randomSource.roll(CardCreationPurpose.template(grade), candidates.size());
        return new TemplateSelection(candidates.get(templateRoll), templateRoll);
    }

    /**
     * 카드의 3개 스탯 포지션을 중복 없이 선택한다.
     */
    private List<PositionType> pickDistinctPositions(CardCreationRandomSource randomSource) {
        List<PositionType> candidates = new ArrayList<>(Arrays.asList(PositionType.values()));
        List<PositionType> selected = new ArrayList<>(3);

        for (int i = 0; i < 3; i++) {
            int index = randomSource.roll(CardCreationPurpose.position(i + 1), candidates.size());
            selected.add(candidates.remove(index));
        }

        return selected;
    }

    /**
     * 등급별 스탯 범위 안에서 개별 스탯 값을 생성한다.
     */
    private int nextStatValue(CardCreationRandomSource randomSource, int statIndex, int min, int max) {
        int range = max - min + 1;
        int statRoll = randomSource.roll(CardCreationPurpose.stat(statIndex), range);
        return min + statRoll;
    }

    /**
     * S급 카드에만 30% 지급 규칙과 후보 필터를 적용해 특수능력을 선택한다.
     */
    private SpecialSkillSelection selectSpecialSkill(
            CardGrade grade,
            CardCreationRandomSource randomSource
    ) {
        if (grade != CardGrade.S) {
            return new SpecialSkillSelection(null, null);
        }

        int grantRoll = randomSource.roll(
                CardCreationPurpose.specialSkillGranted(),
                gachaPolicyRegistry.getRollBound()
        );
        if (!gachaPolicyRegistry.isSpecialSkillGranted(grantRoll)) {
            return new SpecialSkillSelection(null, null);
        }


        List<SpecialSkillTemplate> candidates = specialSkillTemplateRepository.findAllByActiveTrueAndDeletedFalseOrderByIdAsc()
                .stream()
                .sorted(Comparator.comparing(SpecialSkillTemplate::getId))
                .toList();

        if (candidates.isEmpty()) {
            throw new IllegalStateException("No drawable special skill for S grade");
        }

        int skillRoll = randomSource.roll(CardCreationPurpose.specialSkill(), candidates.size());
        return new SpecialSkillSelection(candidates.get(skillRoll), skillRoll);
    }

    private record TemplateSelection(
            CardTemplate template,
            int templateRoll
    ) {
    }

    private record SpecialSkillSelection(
            SpecialSkillTemplate specialSkillTemplate,
            Integer skillRoll
    ) {
    }
}
