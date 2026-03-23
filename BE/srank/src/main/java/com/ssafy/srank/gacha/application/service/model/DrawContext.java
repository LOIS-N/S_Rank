package com.ssafy.srank.gacha.application.service.model;

import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.user.domain.entity.User;

import java.time.LocalDateTime;

public record DrawContext(
        Long userId,
        GachaType type,
        int count,
        String clientSeed,
        ProbablyFairContext pfContext,
        User user,
        long cost,
        LocalDateTime requestedAt
) {
}
