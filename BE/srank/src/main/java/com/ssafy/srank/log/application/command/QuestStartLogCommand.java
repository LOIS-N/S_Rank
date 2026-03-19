package com.ssafy.srank.log.application.command;

import java.time.LocalDateTime;
import java.util.List;

public record QuestStartLogCommand(
        Long userId,
        Long templateId,
        LocalDateTime startedAt,
        LocalDateTime createdAt,
        List<QuestCardLogCommand> cards
) {
}
