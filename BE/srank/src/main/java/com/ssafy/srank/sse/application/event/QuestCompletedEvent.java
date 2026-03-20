package com.ssafy.srank.sse.application.event;

public record QuestCompletedEvent(
        Long userId,
        Long questId,
        String questType,
        String message
) {
}