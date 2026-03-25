package com.ssafy.srank.gacha.application.service.model;

import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.gacha.domain.enums.GachaType;

import java.time.LocalDateTime;

public record DrawContext(
        Long userId,
        String walletAddress,
        GachaType type,
        int count,
        String clientSeed,
        ProbablyFairContext pfContext,
        long cost,
        LocalDateTime requestedAt
) {
}
