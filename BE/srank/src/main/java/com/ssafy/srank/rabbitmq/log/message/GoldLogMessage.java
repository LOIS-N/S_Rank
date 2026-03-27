package com.ssafy.srank.rabbitmq.log.message;

import com.ssafy.srank.log.domain.enums.GoldLogReason;

import java.time.LocalDateTime;

/**
 * 골드 로그 메시지
 * UserGoldLog 엔티티 컬럼 기준으로 구성
 */
public record GoldLogMessage(
        Long userId,
        long amount,
        long balanceAfter,
        GoldLogReason reason,
        LocalDateTime createdAt
) {}
