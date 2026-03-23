package com.ssafy.srank.gacha.domain.enums;

import com.ssafy.srank.common.probablyfair.domain.ProbablyFairPurpose;

public enum GachaRollPurpose implements ProbablyFairPurpose {
    GRADE("GACHA_GRADE"),
    TEMPLATE("GACHA_TEMPLATE"),
    // S 등급에서 특수능력 자체를 받을지 먼저 판정한 뒤, 당첨 시에만 실제 SKILL roll을 수행한다.
    SPECIAL_SKILL_GRANTED("GACHA_SPECIAL_SKILL_GRANTED"),
    SKILL("GACHA_SKILL"),
    POSITION("GACHA_POSITION"),
    STAT("GACHA_STAT");

    private final String proofKey;

    GachaRollPurpose(String proofKey) {
        this.proofKey = proofKey;
    }

    @Override
    public String proofKey() {
        return proofKey;
    }

    /**
     * 포지션/스탯처럼 같은 목적 안에서 순번별 roll을 분리할 때 사용한다.
     */
    public ProbablyFairPurpose withIndex(int index) {
        return ProbablyFairPurpose.of(proofKey + "_" + index);
    }

    /**
     * 템플릿처럼 타입/등급별 후보군이 달라지는 roll을 분리할 때 사용한다.
     */
    public ProbablyFairPurpose withSuffix(String suffix) {
        return ProbablyFairPurpose.of(proofKey + "_" + suffix);
    }
}
