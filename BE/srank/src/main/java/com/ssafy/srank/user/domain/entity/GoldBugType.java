package com.ssafy.srank.user.domain.entity;

public enum GoldBugType {
    NORMAL(50L),
    GOLDEN(100L);

    private final long goldReward;

    GoldBugType(long goldReward) {
        this.goldReward = goldReward;
    }

    public long getGoldReward() {
        return goldReward;
    }
}
