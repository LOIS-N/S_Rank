package com.ssafy.srank.log.application.command;

import com.ssafy.srank.log.domain.enums.AuthLogEventType;

import java.time.LocalDateTime;

public record AuthLogCommand(
        Long userId,
        AuthLogEventType eventType,
        LocalDateTime createdAt
) {
}
