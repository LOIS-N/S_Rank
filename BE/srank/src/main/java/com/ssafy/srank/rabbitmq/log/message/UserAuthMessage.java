package com.ssafy.srank.rabbitmq.log.message;

import com.ssafy.srank.log.domain.enums.AuthLogEventType;

import java.time.LocalDateTime;

public record UserAuthMessage (
    Long userId,
    AuthLogEventType eventType,
    LocalDateTime createdAt
){}
