package com.ssafy.srank.ranking.domain.entity;

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
@Table(name = "card_stat_total_ranking_snapshot")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class CardStatTotalRankingSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "card_stat_total_ranking_snapshot_id")
    private Long id;

    @Column(name = "rank", nullable = false)
    private int rank;

    @Column(name = "user_card_id", nullable = false)
    private Long userCardId;

    @Column(name = "card_name", nullable = false, length = 100)
    private String cardName;

    @Column(name = "stat_total", nullable = false)
    private int statTotal;

    @Column(name = "achieved_at", nullable = false)
    private LocalDateTime achievedAt;

    @Column(name = "snapshot_at", nullable = false)
    private LocalDateTime snapshotAt;
}
