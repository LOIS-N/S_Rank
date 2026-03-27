package com.ssafy.srank.ranking.application.event;

public record GoldEarnedEvent(
        Long userId,
        long amount
) {
}
