package com.ssafy.srank.card.application.dto.response;

public record UserCardCursor(
        int grade,
        int totalStat,
        Long cardId
) {
}