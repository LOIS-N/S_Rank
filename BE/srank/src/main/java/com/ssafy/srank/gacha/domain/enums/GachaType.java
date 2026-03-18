package com.ssafy.srank.gacha.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

public enum GachaType {
    FLYER,
    EXPO,
    OPEN_RECRUIT;

    @JsonCreator
    public static GachaType from(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return GachaType.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
