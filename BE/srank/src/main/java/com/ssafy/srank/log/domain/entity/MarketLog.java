package com.ssafy.srank.log.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "market_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class MarketLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "market_log_id")
    private Long marketLogId;

    @Column(name = "market_item_id", nullable = false)
    private Long marketItemId;

    @Column(name = "seller_user_id")
    private Long sellerUserId;

    @Column(name = "user_card_id")
    private Long userCardId;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    @Column(name = "event_status", nullable = false, length = 20)
    private String eventStatus;

    @Column(name = "price_coin")
    private Integer priceCoin;

    @Column(name = "tx_hash", length = 255)
    private String txHash;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
