package com.ssafy.srank.log.application.command;

import com.ssafy.srank.log.domain.enums.QuestLogStatus;

import java.time.LocalDateTime;

public record QuestEventLogCommand(
        Long userId,
        Long templateId,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        LocalDateTime claimedAt,
        Integer actualDurationMinutes,
        QuestLogStatus status,
        LocalDateTime createdAt
) {
}
