package com.ssafy.srank.enhancement.domain.policy;

public final class EnhancePolicy {

    private EnhancePolicy() {}

    public enum Grade {
        D(80, 2000, 2),
        C(70, 5000, 3),
        B(60, 20000, 5),
        A(45, 90000, 8),
        S(35, 250000, 10);

        public final int successRate;      // 성공 확률 (%)
        public final int costGold;         // 1회 비용
        public final int statIncrease;     // 강당 능력치 증가

        Grade(int successRate, int costGold, int statIncrease) {
            this.successRate = successRate;
            this.costGold = costGold;
            this.statIncrease = statIncrease;
        }
    }

    public static final int MAX_ENHANCE_LEVEL = 7; // 풀강 제한
}