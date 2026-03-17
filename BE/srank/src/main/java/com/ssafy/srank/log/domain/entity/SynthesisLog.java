package com.ssafy.srank.log.domain.entity;

import com.ssafy.srank.card.domain.enums.CardGrade;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "synthesis_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class SynthesisLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "synthesis_log_id")
    private Long synthesisLogId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "result_user_card_id")
    private Long resultUserCardId;

    @Column(name = "success", nullable = false)
    private boolean success;

    @Column(name = "cost_gold", nullable = false)
    private int costGold;

    @Column(name = "source_user_card_id_1")
    private Long sourceUserCardId1;

    @Column(name = "source_user_card_id_2")
    private Long sourceUserCardId2;

    @Column(name = "source_user_card_id_3")
    private Long sourceUserCardId3;

    @Column(name = "source_user_card_id_4")
    private Long sourceUserCardId4;

    @Column(name = "source_user_card_id_5")
    private Long sourceUserCardId5;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_card_grade", nullable = false, length = 1)
    private CardGrade sourceCardGrade;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
