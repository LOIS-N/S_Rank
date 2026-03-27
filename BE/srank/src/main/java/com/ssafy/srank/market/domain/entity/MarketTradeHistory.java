package com.ssafy.srank.market.domain.entity;

import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.common.entity.BaseEntity;
import com.ssafy.srank.market.domain.enums.MarketHistoryType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "market_trade_history")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketTradeHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long marketTradeHistoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market_item_id", nullable = false)
    private MarketItem marketItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_card_id", nullable = false)
    private UserCard userCard;

    @Column(nullable = false)
    private Long sellerUserId;

    private Long buyerUserId;

    private String nftTokenId;

    private Integer priceCoin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MarketHistoryType historyType;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private LocalDateTime eventAt;

    private LocalDateTime expiresAt;

    private String memo;

    @Column(length = 255)
    private String txHash;

    public static MarketTradeHistory ofSellRegistered(MarketItem item) {
        return MarketTradeHistory.builder()
                .marketItem(item)
                .userCard(item.getUserCard())
                .sellerUserId(item.getSellerUserId())
                .nftTokenId(null)
                .priceCoin(item.getPriceCoin())
                .historyType(MarketHistoryType.SELL_REGISTERED)
                .status("PENDING")
                .eventAt(LocalDateTime.now())
                .expiresAt(item.getExpiresAt())
                .txHash(null)
                .build();
    }

    public static MarketTradeHistory ofSellCompleted(MarketItem item, String txHash) {
        return MarketTradeHistory.builder()
                .marketItem(item)
                .userCard(item.getUserCard())
                .sellerUserId(item.getSellerUserId())
                .buyerUserId(item.getBuyerUserId())
                .nftTokenId(item.getNftTokenId())
                .priceCoin(item.getPriceCoin())
                .historyType(MarketHistoryType.SELL_COMPLETED)
                .status("COMPLETED")
                .eventAt(LocalDateTime.now())
                .txHash(txHash)
                .build();
    }

    public static MarketTradeHistory ofBuyCompleted(MarketItem item, String txHash) {
        return MarketTradeHistory.builder()
                .marketItem(item)
                .userCard(item.getUserCard())
                .sellerUserId(item.getSellerUserId())
                .buyerUserId(item.getBuyerUserId())
                .nftTokenId(item.getNftTokenId())
                .priceCoin(item.getPriceCoin())
                .historyType(MarketHistoryType.BUY_COMPLETED)
                .status("COMPLETED")
                .eventAt(LocalDateTime.now())
                .txHash(txHash)
                .build();
    }
}