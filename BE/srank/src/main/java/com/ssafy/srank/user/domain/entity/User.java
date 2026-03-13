package com.ssafy.srank.user.domain.entity;

import com.ssafy.srank.auth.domain.entity.AuthProvider;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_users_email", columnNames = "email"),
                @UniqueConstraint(name = "uq_users_provider_oauth_id", columnNames = {"provider", "oauth_id"})
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(nullable = false, length = 255)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuthProvider provider;

    @Column(name = "oauth_id", nullable = false, length = 255)
    private String oauthId;

    @Column(length = 50)
    private String nickname;

    @Column(name = "wallet_address", length = 255)
    private String walletAddress;

    @Column(nullable = false)
    private int level;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    private User(String email, AuthProvider provider, String oauthId, String nickname) {
        this.email = email;
        this.provider = provider;
        this.oauthId = oauthId;
        this.nickname = nickname;
        this.level = 0;
    }

    public static User create(String email, AuthProvider provider, String oauthId, String nickname) {
        return new User(email, provider, oauthId, nickname);
    }

    public boolean isWithdrawn() {
        return deletedAt != null;
    }

    public void changeNickname(String nickname) {
        this.nickname = nickname;
    }

    public void assignWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public void withdraw() {
        this.deletedAt = LocalDateTime.now();
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
