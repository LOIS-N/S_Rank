package com.ssafy.srank.mail.domain.entity;

import com.ssafy.srank.common.entity.BaseEntity;
import com.ssafy.srank.mail.domain.enums.MailType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_mail_box")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailBox extends BaseEntity {

    @Id
    @Column(name = "id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long mailId;

    @Column(nullable = false)
    private boolean isRead;

    @Column(nullable = false)
    private boolean isClaimed;

    @Column(nullable = false, length = 255)
    private String message;

    @Column()
    private Long reward;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "mail_type", nullable = false)
    private MailType mailType;

    // ===== 상태 변경 메서드 =====

    public void markAsRead() {
        this.isRead = true;
    }

    public void claimReward() {
        this.isClaimed = true;
    }
}