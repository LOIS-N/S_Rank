package com.ssafy.srank.log.application.command;

import com.ssafy.srank.log.domain.enums.GoldLogReason;

import java.time.LocalDateTime;

public record GoldLogCommand(
        Long userId,
        long amount,
        long balanceAfter,
        GoldLogReason reason,
        LocalDateTime createdAt
) {
}
