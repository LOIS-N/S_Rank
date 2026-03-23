package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.entity.SkillStat;
import com.ssafy.srank.card.domain.entity.SpecialSkillEffect;
import com.ssafy.srank.card.domain.entity.SpecialSkillTemplate;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.domain.enums.ConditionType;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.repository.CardTemplateRepository;
import com.ssafy.srank.card.repository.SpecialSkillTemplateRepository;
import com.ssafy.srank.common.probablyfair.application.service.ProbablyFairService;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawProofItemResponse;
import com.ssafy.srank.gacha.application.service.model.PreparedDraw;
import com.ssafy.srank.gacha.application.service.model.SpecialSkillSelection;
import com.ssafy.srank.gacha.application.service.model.TemplateSelection;
import com.ssafy.srank.gacha.domain.enums.GachaRollPurpose;
import com.ssafy.srank.gacha.domain.enums.GachaType;
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
public class GachaDrawPreparationServiceImpl implements GachaDrawPreparationService {

    // TODO: 카드 카탈로그/스킬 조회 service가 준비되면 다른 패키지 repository 직접 접근을 해당 service 호출로 교체한다.
    private final CardTemplateRepository cardTemplateRepository;
    private final SpecialSkillTemplateRepository specialSkillTemplateRepository;
    private final GachaPolicyRegistry gachaPolicyRegistry;
    private final ProbablyFairService probablyFairService;

    @Override
    public List<PreparedDraw> createPreparedDraws(
            Long userId,
            GachaType type,
            String clientSeed,
            ProbablyFairContext pfContext,
            int count
    ) {
        // 요청 수량만큼 drawIndex를 고정하며 카드 준비 결과를 누적한다.
        List<PreparedDraw> preparedDraws = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            // 10연에서도 카드 순번을 drawIndex로 고정해 verify 시 동일 결과를 재현한다.
            preparedDraws.add(createPreparedDraw(userId, type, clientSeed, pfContext, i));
        }
        return preparedDraws;
    }

    /**
     * 등급, 템플릿, 포지션, 특수능력, 스탯을 같은 순서로 계산해 카드 1장을 준비한다.
     */
    private PreparedDraw createPreparedDraw(
            Long userId,
            GachaType type,
            String clientSeed,
            ProbablyFairContext pfContext,
            int drawIndex
    ) {
        int gradeRoll = probablyFairService.roll(
                pfContext,
                clientSeed,
                drawIndex,
                GachaRollPurpose.GRADE,
                gachaPolicyRegistry.getRollBound()
        );
        CardGrade grade = gachaPolicyRegistry.selectGrade(type, gradeRoll);
        TemplateSelection templateSelection = selectTemplate(type, grade, clientSeed, pfContext, drawIndex);
        List<PositionType> positions = pickDistinctPositions(clientSeed, pfContext, drawIndex);
        SpecialSkillSelection skillSelection = selectSpecialSkill(grade, positions, clientSeed, pfContext, drawIndex);

        int minStat = gachaPolicyRegistry.minStat(grade);
        int maxStat = gachaPolicyRegistry.maxStat(grade);
        UserCard userCard = UserCard.builder()
                .userId(userId)
                .cardTemplate(templateSelection.template())
                .specialSkillTemplate(skillSelection.specialSkillTemplate())
                .stat1(new SkillStat(positions.get(0), nextStatValue(clientSeed, pfContext, drawIndex, 1, minStat, maxStat), 0))
                .stat2(new SkillStat(positions.get(1), nextStatValue(clientSeed, pfContext, drawIndex, 2, minStat, maxStat), 0))
                .stat3(new SkillStat(positions.get(2), nextStatValue(clientSeed, pfContext, drawIndex, 3, minStat, maxStat), 0))
                .enhanceTryCount(0)
                .enhanceSuccessCount(0)
                .build();

        return new PreparedDraw(
                userCard,
                new GachaDrawProofItemResponse(
                        drawIndex,
                        gradeRoll,
                        templateSelection.templateRoll(),
                        skillSelection.skillRoll(),
                        grade,
                        templateSelection.template().getId(),
                        skillSelection.specialSkillTemplate() == null
                                ? null
                                : skillSelection.specialSkillTemplate().getSkillCode()
                )
        );
    }

    // 카드 Template 선택
    private TemplateSelection selectTemplate(
            GachaType type,
            CardGrade grade,
            String clientSeed,
            ProbablyFairContext pfContext,
            int drawIndex
    ) {
        List<CardTemplate> candidates = cardTemplateRepository
                .findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalseOrderByIdAsc(grade);

        if (candidates.isEmpty()) {
            throw new IllegalStateException("No drawable card template for grade " + grade);
        }

        int templateRoll = probablyFairService.roll(
                pfContext,
                clientSeed,
                drawIndex,
                GachaRollPurpose.TEMPLATE.withSuffix(type.name() + "_" + grade.name()),
                candidates.size()
        );
        return new TemplateSelection(candidates.get(templateRoll), templateRoll);
    }

    // 포지션 결정
    private List<PositionType> pickDistinctPositions(
            String clientSeed,
            ProbablyFairContext pfContext,
            int drawIndex
    ) {
        List<PositionType> candidates = new ArrayList<>(Arrays.asList(PositionType.values()));
        List<PositionType> selected = new ArrayList<>(3);

        for (int i = 0; i < 3; i++) {
            int index = probablyFairService.roll(
                    pfContext,
                    clientSeed,
                    drawIndex,
                    GachaRollPurpose.POSITION.withIndex(i + 1),
                    candidates.size()
            );
            selected.add(candidates.remove(index));
        }

        return selected;
    }

    // 스탯 결정
    private int nextStatValue(
            String clientSeed,
            ProbablyFairContext pfContext,
            int drawIndex,
            int statIndex,
            int min,
            int max
    ) {
        int range = max - min + 1;
        int statRoll = probablyFairService.roll(
                pfContext,
                clientSeed,
                drawIndex,
                GachaRollPurpose.STAT.withIndex(statIndex),
                range
        );
        return min + statRoll;
    }

    // 특수능력 선택
    private SpecialSkillSelection selectSpecialSkill(
            CardGrade grade,
            List<PositionType> positions,
            String clientSeed,
            ProbablyFairContext pfContext,
            int drawIndex
    ) {
        if (grade != CardGrade.S) {
            return new SpecialSkillSelection(null, null);
        }

        // S 등급이어도 먼저 30% 지급 여부를 판정하고, 실패하면 특수능력을 부여하지 않는다.
        int specialSkillGrantRoll = probablyFairService.roll(
                pfContext,
                clientSeed,
                drawIndex,
                GachaRollPurpose.SPECIAL_SKILL_GRANTED,
                gachaPolicyRegistry.getRollBound()
        );
        if (!gachaPolicyRegistry.isSpecialSkillGranted(specialSkillGrantRoll)) {
            return new SpecialSkillSelection(null, null);
        }

        List<SpecialSkillTemplate> candidates = specialSkillTemplateRepository.findAllByActiveTrueAndDeletedFalseOrderByIdAsc()
                .stream()
                .filter(skill -> isEligibleForPositions(skill, positions))
                .sorted(Comparator.comparing(SpecialSkillTemplate::getId))
                .toList();

        if (candidates.isEmpty()) {
            throw new IllegalStateException("No drawable special skill for S grade");
        }

        // 지급이 확정된 경우에만 실제 특수능력 종류를 다시 roll 한다.
        int skillRoll = probablyFairService.roll(
                pfContext,
                clientSeed,
                drawIndex,
                GachaRollPurpose.SKILL,
                candidates.size()
        );

        return new SpecialSkillSelection(candidates.get(skillRoll), skillRoll);
    }

    // 특수능력 포지션에 맞게 검증
    private boolean isEligibleForPositions(SpecialSkillTemplate skillTemplate, List<PositionType> positions) {

        Set<PositionType> referencedPositions = new HashSet<>();
        for (SpecialSkillEffect effect : skillTemplate.getEffects()) {
            if (effect.getConditionPosition() != null) {
                referencedPositions.add(effect.getConditionPosition());
            }
            if (effect.getTargetPosition() != null) {
                referencedPositions.add(effect.getTargetPosition());
            }
            if (effect.getConditionType() == ConditionType.WHEN_ASSIGNED_TO_POSITION && effect.getConditionPosition() != null) {
                referencedPositions.add(effect.getConditionPosition());
            }
        }

        if (referencedPositions.isEmpty()) {
            return true;
        }

        return positions.stream().anyMatch(referencedPositions::contains);
    }
}
