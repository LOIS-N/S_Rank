package com.ssafy.srank.gacha.domain.policy;

import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class GachaPolicyRegistry {

    private static final int PERCENT_SCALE = 100;
    private static final int ROLL_BOUND = 10_000;
    private static final int SPECIAL_SKILL_GRANTED_THRESHOLD = 30 * PERCENT_SCALE;

    private final Map<GachaType, GachaPolicy> policies = new EnumMap<>(GachaType.class);

    public GachaPolicyRegistry() {
        policies.put(GachaType.FLYER, new GachaPolicy(
                1,
                10_000L,
                70_000L,
                List.of(
                        new GradeWeight(CardGrade.B, 10 * PERCENT_SCALE),
                        new GradeWeight(CardGrade.C, 30 * PERCENT_SCALE),
                        new GradeWeight(CardGrade.D, 60 * PERCENT_SCALE)
                )
        ));
        policies.put(GachaType.EXPO, new GachaPolicy(
                3,
                15_000L,
                135_000L,
                List.of(
                        new GradeWeight(CardGrade.A, 10 * PERCENT_SCALE),
                        new GradeWeight(CardGrade.B, 20 * PERCENT_SCALE),
                        new GradeWeight(CardGrade.C, 40 * PERCENT_SCALE),
                        new GradeWeight(CardGrade.D, 30 * PERCENT_SCALE)
                )
        ));
        policies.put(GachaType.OPEN_RECRUIT, new GachaPolicy(
                5,
                40_000L,
                360_000L,
                List.of(
                        new GradeWeight(CardGrade.S, 4 * PERCENT_SCALE),
                        new GradeWeight(CardGrade.A, 13 * PERCENT_SCALE),
                        new GradeWeight(CardGrade.B, 28 * PERCENT_SCALE),
                        new GradeWeight(CardGrade.C, 35 * PERCENT_SCALE),
                        new GradeWeight(CardGrade.D, 20 * PERCENT_SCALE)
                )
        ));
    }

    public long calculateCost(GachaType type, int count) {
        GachaPolicy policy = getPolicy(type);
        return switch (count) {
            case 1 -> policy.singleDrawCost();
            case 10 -> policy.tenDrawCost();
            default -> throw new IllegalArgumentException("Unsupported draw count: " + count);
        };
    }

    public void validateUnlocked(GachaType type, int userLevel) {
        if (userLevel < getPolicy(type).requiredLevel()) {
            throw new BusinessException(ErrorCode.GACHA_TYPE_LOCKED);
        }
    }

    public CardGrade selectGrade(GachaType type, int gradeRoll) {
        int cumulative = 0;
        for (GradeWeight gradeWeight : getPolicy(type).gradeWeights()) {
            cumulative += gradeWeight.weight();
            if (gradeRoll < cumulative) {
                return gradeWeight.grade();
            }
        }
        throw new IllegalStateException("Unreachable grade roll: " + gradeRoll);
    }

    public int getRequiredLevel(GachaType type) {
        return getPolicy(type).requiredLevel();
    }

    public int getRollBound() {
        return ROLL_BOUND;
    }

    // 10,000 스케일 기준으로 0~2,999를 특수능력 지급 성공으로 본다.
    public boolean isSpecialSkillGranted(int grantRoll) {
        return grantRoll < SPECIAL_SKILL_GRANTED_THRESHOLD;
    }

    public int minStat(CardGrade grade) {
        return switch (grade) {
            case S -> 80;
            case A -> 60;
            case B -> 40;
            case C -> 20;
            case D -> 1;
        };
    }

    public int maxStat(CardGrade grade) {
        return switch (grade) {
            case S -> 100;
            case A -> 80;
            case B -> 60;
            case C -> 40;
            case D -> 20;
        };
    }

    public List<GradeWeight> getGradeWeights(GachaType type) {
        return getPolicy(type).gradeWeights();
    }

    private GachaPolicy getPolicy(GachaType type) {
        GachaPolicy policy = policies.get(type);
        if (policy == null) {
            throw new BusinessException(ErrorCode.GACHA_TYPE_INVALID);
        }
        return policy;
    }

    public record GachaPolicy(
            int requiredLevel,
            long singleDrawCost,
            long tenDrawCost,
            List<GradeWeight> gradeWeights
    ) {
    }

    public record GradeWeight(
            CardGrade grade,
            int weight
    ) {
    }
}
