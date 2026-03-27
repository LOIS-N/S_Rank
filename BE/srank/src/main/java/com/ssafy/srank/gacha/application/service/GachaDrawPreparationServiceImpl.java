package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.common.cardcreation.CardCreationCommand;
import com.ssafy.srank.common.cardcreation.CardCreationMetadata;
import com.ssafy.srank.common.cardcreation.CardCreationPurpose;
import com.ssafy.srank.common.cardcreation.CardCreationRandomSource;
import com.ssafy.srank.common.cardcreation.CardCreationService;
import com.ssafy.srank.common.cardcreation.CreatedCardDraft;
import com.ssafy.srank.common.probablyfair.application.service.ProbablyFairService;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairPurpose;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawProofItemResponse;
import com.ssafy.srank.gacha.application.service.model.PreparedDraw;
import com.ssafy.srank.gacha.domain.enums.GachaRollPurpose;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.gacha.domain.policy.GachaPolicyRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GachaDrawPreparationServiceImpl implements GachaDrawPreparationService {

    private final GachaPolicyRegistry gachaPolicyRegistry;
    private final ProbablyFairService probablyFairService;
    private final CardCreationService cardCreationService;

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
        for (int drawIndex = 0; drawIndex < count; drawIndex++) {
            // 10연에서도 카드 순번을 drawIndex로 고정해 verify 시 동일 결과를 재현한다.
            preparedDraws.add(createPreparedDraw(userId, type, clientSeed, pfContext, drawIndex));
        }
        return preparedDraws;
    }

    /**
     * 등급 roll은 가챠 계층에서 수행하고, 카드 생성 규칙은 공통 생성 서비스로 위임한다.
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
        CardCreationRandomSource randomSource = createRandomSource(type, grade, clientSeed, pfContext, drawIndex);
        CreatedCardDraft createdCardDraft = cardCreationService.create(
                new CardCreationCommand(userId, grade),
                randomSource
        );

        return new PreparedDraw(
                createdCardDraft.userCard(),
                buildProofItem(drawIndex, gradeRoll, grade, createdCardDraft.metadata())
        );
    }

    /**
     * 공통 생성 서비스의 목적 문자열을 가챠 PF purpose로 변환하는 어댑터다.
     */
    private CardCreationRandomSource createRandomSource(
            GachaType type,
            CardGrade grade,
            String clientSeed,
            ProbablyFairContext pfContext,
            int drawIndex
    ) {
        return (purpose, bound) -> probablyFairService.roll(
                pfContext,
                clientSeed,
                drawIndex,
                mapPurpose(type, grade, purpose),
                bound
        );
    }

    /**
     * 분리된 카드 생성 purpose를 기존 가챠 proof key 체계로 맞춰 deterministic 결과를 유지한다.
     */
    private ProbablyFairPurpose mapPurpose(GachaType type, CardGrade grade, String purpose) {
        if (purpose.equals(CardCreationPurpose.specialSkillGranted())) {
            return GachaRollPurpose.SPECIAL_SKILL_GRANTED;
        }
        if (purpose.equals(CardCreationPurpose.specialSkill())) {
            return GachaRollPurpose.SKILL;
        }
        if (purpose.startsWith("POSITION_")) {
            int index = Integer.parseInt(purpose.substring("POSITION_".length()));
            return GachaRollPurpose.POSITION.withIndex(index);
        }
        if (purpose.startsWith("STAT_")) {
            int index = Integer.parseInt(purpose.substring("STAT_".length()));
            return GachaRollPurpose.STAT.withIndex(index);
        }
        if (purpose.equals(CardCreationPurpose.template(grade))) {
            return GachaRollPurpose.TEMPLATE.withSuffix(type.name() + "_" + grade.name());
        }
        return ProbablyFairPurpose.of(purpose);
    }

    /**
     * 공통 생성 메타데이터를 가챠 proof 응답 형식으로 변환한다.
     */
    private GachaDrawProofItemResponse buildProofItem(
            int drawIndex,
            int gradeRoll,
            CardGrade grade,
            CardCreationMetadata metadata
    ) {
        return new GachaDrawProofItemResponse(
                drawIndex,
                gradeRoll,
                metadata.templateRoll(),
                metadata.skillRoll(),
                grade,
                metadata.selectedTemplateId(),
                metadata.selectedSpecialSkillCode()
        );
    }
}
