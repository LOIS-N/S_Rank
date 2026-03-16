package com.ssafy.srank.user.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "user_coin")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserCoinLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_coin_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private long amount;

    @Column(name = "balance_after", nullable = false)
    private long balanceAfter;

    @Column(nullable = false, length = 30)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private UserCoinLedger(Long userId, long amount, long balanceAfter, String reason) {
        this.userId = userId;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.reason = reason;
    }

    public static UserCoinLedger create(Long userId, long amount, long balanceAfter, String reason) {
        return new UserCoinLedger(userId, amount, balanceAfter, reason);
    }

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
