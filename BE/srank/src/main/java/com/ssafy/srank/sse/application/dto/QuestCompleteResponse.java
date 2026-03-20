package com.ssafy.srank.sse.application.dto;

public record QuestCompleteResponse(
        Long questId,
        String questType,
        String message
) {}