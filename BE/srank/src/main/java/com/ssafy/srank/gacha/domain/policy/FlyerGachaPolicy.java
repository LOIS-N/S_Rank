package com.ssafy.srank.gacha.domain.policy;

import com.ssafy.srank.card.domain.enums.CardGrade;
import org.springframework.stereotype.Component;

@Component
public class FlyerGachaPolicy {

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
        if (roll < 0.10d) {
            return CardGrade.B;
        }
        if (roll < 0.40d) {
            return CardGrade.C;
        }
        return CardGrade.D;
    }

    public int minStat(CardGrade grade) {
        return switch (grade) {
            case B -> 40;
            case C -> 20;
            case D -> 1;
            default -> throw new IllegalArgumentException("Unsupported flyer grade: " + grade);
        };
    }

    public int maxStat(CardGrade grade) {
        return switch (grade) {
            case B -> 60;
            case C -> 40;
            case D -> 20;
            default -> throw new IllegalArgumentException("Unsupported flyer grade: " + grade);
        };
    }
}
