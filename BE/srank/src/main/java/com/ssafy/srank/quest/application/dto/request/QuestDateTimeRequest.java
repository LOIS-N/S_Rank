package com.ssafy.srank.quest.application.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
@Getter
@AllArgsConstructor
@Builder
public class QuestDateTimeRequest {
    private LocalDateTime startAt;
    private LocalDateTime endAt;
}
