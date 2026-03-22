package com.ssafy.srank.gacha.domain.enums;

public enum RollPurpose {
    GRADE,
    TEMPLATE,
    SKILL,
    POSITION,
    STAT;

    public String key() {
        return name();
    }

    public String key(int index) {
        return name() + "_" + index;
    }

    public String key(String suffix) {
        return name() + "_" + suffix;
    }
}
