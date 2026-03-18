package com.ssafy.srank.gacha.domain.policy;

import com.ssafy.srank.card.domain.enums.CardGrade;
import org.springframework.stereotype.Component;

@Component
public class FlyerGachaPolicy {

    // 10회는 10% 할인된 가격을 그대로 고정값으로 둔다.
    private static final long SINGLE_DRAW_COST = 10_000L;
    private static final long TEN_DRAW_COST = 90_000L;

    public long calculateCost(int count) {
        return switch (count) {
            case 1 -> SINGLE_DRAW_COST;
            case 10 -> TEN_DRAW_COST;
            default -> throw new IllegalArgumentException("Unsupported draw count: " + count);
        };
    }

    public CardGrade selectGrade(double roll) {
        // 전단 확률표: B 10%, C 30%, D 60%
        if (roll < 0.10d) {
            return CardGrade.B;
        }
        if (roll < 0.40d) {
            return CardGrade.C;
        }
        return CardGrade.D;
    }

    public int minStat(CardGrade grade) {
        // 개별 스탯 최소값은 기획서의 등급별 범위를 그대로 따른다.
        return switch (grade) {
            case B -> 40;
            case C -> 20;
            case D -> 1;
            default -> throw new IllegalArgumentException("Unsupported flyer grade: " + grade);
        };
    }

    public int maxStat(CardGrade grade) {
        // 개별 스탯 최대값은 기획서의 등급별 범위를 그대로 따른다.
        return switch (grade) {
            case B -> 60;
            case C -> 40;
            case D -> 20;
            default -> throw new IllegalArgumentException("Unsupported flyer grade: " + grade);
        };
    }
}
