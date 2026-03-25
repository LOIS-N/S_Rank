package com.ssafy.srank.rabbitmq.log.message;

import java.time.LocalDateTime;

/**
 * 거래 아이템 로그 메시지
 * MarketItemLog 엔티티 컬럼 기준으로 구성
 */
public record MarketItemLogMessage(
        Long sellerUserId,
        Long userCardId,
        int priceCoin,
        String saleStatus,
        LocalDateTime listedAt,
        LocalDateTime expiredAt,
        LocalDateTime soldAt,
        String mintTxHash,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
