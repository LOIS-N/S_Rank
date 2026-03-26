package com.ssafy.srank.market.domain.entity;

import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.common.entity.BaseEntity;
import com.ssafy.srank.market.domain.enums.MarketItemStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "market_item")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long marketItemId;

    @Column(nullable = false)
    private Long sellerUserId;

    private Long buyerUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_card_id", nullable = false)
    private UserCard userCard;

    private String nftTokenId;

    @Column(nullable = false)
    private Long priceCoin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MarketItemStatus status;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime soldAt;

    private LocalDateTime canceledAt;

    /** 판매 등록 후 NFT 발급 완료 시 ON_SALE로 전환 */
    public void markOnSale(String nftTokenId) {
        this.nftTokenId = nftTokenId;
        this.status = MarketItemStatus.ON_SALE;
    }

    /** 구매 요청 접수 시 BUY_PENDING으로 전환 */
    public void markBuyPending(Long buyerUserId) {
        this.buyerUserId = buyerUserId;
        this.status = MarketItemStatus.BUY_PENDING;
    }

    /** 구매 완료 시 SOLD로 전환 */
    public void markSold() {
        this.status = MarketItemStatus.SOLD;
        this.soldAt = LocalDateTime.now();
    }

    /** 처리 실패 시 FAILED로 전환 */
    public void markFailed() {
        this.status = MarketItemStatus.FAILED;
    }
}