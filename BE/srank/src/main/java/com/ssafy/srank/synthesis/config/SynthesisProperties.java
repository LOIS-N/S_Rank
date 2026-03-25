package com.ssafy.srank.synthesis.config;

import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class SynthesisProperties {

    private static final Map<CardGrade, GradeRule> GRADE_RULES = Map.of(
            CardGrade.D, GradeRule.of(500, 60, 70, 80),
            CardGrade.C, GradeRule.of(5_000, 40, 50, 60),
            CardGrade.B, GradeRule.of(30_000, 25, 30, 35),
            CardGrade.A, GradeRule.of(50_000, 12, 20, 30)
    );

    private static final SGradeRule S_GRADE_RULE = new SGradeRule(0, 100);

    public void validateCardCount(CardGrade grade, int count) {
        if (grade == CardGrade.S) {
            if (count != 2) {
                throw new BusinessException(ErrorCode.SYNTHESIS_MAX_GRADE);
            }
            return;
        }

        if (count < 3 || count > 5) {
            throw new BusinessException(ErrorCode.SYNTHESIS_CARD_COUNT_INVALID);
        }
    }

    public int getCostGold(CardGrade grade) {
        if (grade == CardGrade.S) {
            return S_GRADE_RULE.costGold();
        }
        return getGradeRule(grade).costGold();
    }

    public int getSuccessRate(CardGrade grade, int count) {
        if (grade == CardGrade.S) {
            return S_GRADE_RULE.successRate(count);
        }
        return getGradeRule(grade).successRate(count);
    }

    public CardGrade getSuccessGrade(CardGrade sourceGrade) {
        return switch (sourceGrade) {
            case D -> CardGrade.C;
            case C -> CardGrade.B;
            case B -> CardGrade.A;
            case A -> CardGrade.S;
            case S -> CardGrade.S;
        };
    }

    private GradeRule getGradeRule(CardGrade grade) {
        GradeRule rule = GRADE_RULES.get(grade);
        if (rule == null) {
            throw new IllegalArgumentException("Unsupported synthesis grade: " + grade);
        }
        return rule;
    }

    private record GradeRule(
            int costGold,
            int threeCardSuccessRate,
            int fourCardSuccessRate,
            int fiveCardSuccessRate
    ) {
        private static GradeRule of(int costGold, int threeCardSuccessRate, int fourCardSuccessRate, int fiveCardSuccessRate) {
            return new GradeRule(costGold, threeCardSuccessRate, fourCardSuccessRate, fiveCardSuccessRate);
        }

        private int successRate(int count) {
            return switch (count) {
                case 3 -> threeCardSuccessRate;
                case 4 -> fourCardSuccessRate;
                case 5 -> fiveCardSuccessRate;
                default -> throw new BusinessException(ErrorCode.SYNTHESIS_CARD_COUNT_INVALID);
            };
        }
    }

    private record SGradeRule(
            int costGold,
            int twoCardSuccessRate
    ) {
        private int successRate(int count) {
            if (count != 2) {
                throw new BusinessException(ErrorCode.SYNTHESIS_MAX_GRADE);
            }
            return twoCardSuccessRate;
        }
    }
}
