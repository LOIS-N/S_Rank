package com.ssafy.srank.rabbitmq.log.message;

import java.time.LocalDateTime;

/**
 * 거래 로그 메시지
 * MarketLog 엔티티 컬럼 기준으로 구성
 */
public record MarketLogMessage(
        Long marketItemId,
        Long sellerUserId,
        Long userCardId,
        String eventType,
        String eventStatus,
        Integer priceCoin,
        String txHash,
        LocalDateTime createdAt
) {}
