package com.ssafy.srank.rabbitmq.log.message;

import com.ssafy.srank.log.domain.enums.AuthLogEventType;
import com.ssafy.srank.quest.domain.entity.QuestStatus;

import java.time.LocalDateTime;

public record QuestMessage(
    Long userId,
    String questType,
    Long questTemplateId,
    Long questId,
    Long duration,
    String status,
    LocalDateTime createdAt
){}
