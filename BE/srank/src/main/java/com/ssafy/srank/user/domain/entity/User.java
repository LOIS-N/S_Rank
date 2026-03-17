package com.ssafy.srank.user.domain.entity;

import com.ssafy.srank.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_users_privy_id", columnNames = "privy_id"),
                @UniqueConstraint(name = "uq_users_email", columnNames = "email"),
                @UniqueConstraint(name = "uq_users_wallet_address", columnNames = "wallet_address")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "privy_id", nullable = false, length = 255)
    private String privyId;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "wallet_address", nullable = false, length = 255)
    private String walletAddress;

    @Column(name = "nickname", length = 50)
    private String nickname;

    @Builder.Default
    @Column(name = "level", nullable = false)
    private int level = 0;

    @Builder.Default
    @Column(name = "gold", nullable = false)
    private long gold = 0L;

    @Builder.Default
    @Column(name = "coin", nullable = false)
    private long coin = 0L;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public boolean isWithdrawn() {
        return deletedAt != null;
    }

    public void updateNickname(String nickname) {
        this.nickname = nickname;
    }

    public void withdraw() {
        this.deletedAt = LocalDateTime.now();
    }
}
