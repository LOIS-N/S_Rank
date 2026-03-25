package com.ssafy.srank.ranking.application.event;

public record UserCardStatChangedEvent(
        Long userId,
        Long cardId
) {
}
