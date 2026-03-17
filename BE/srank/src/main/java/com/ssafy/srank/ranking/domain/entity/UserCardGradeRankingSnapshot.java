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
@Table(name = "user_card_grade_ranking_snapshot")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class UserCardGradeRankingSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_card_grade_ranking_snapshot_id")
    private Long id;

    @Column(name = "rank", nullable = false)
    private int rank;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "nickname", length = 50)
    private String nickname;

    @Column(name = "s_count", nullable = false)
    private long sCount;

    @Column(name = "a_count", nullable = false)
    private long aCount;

    @Column(name = "snapshot_at", nullable = false)
    private LocalDateTime snapshotAt;
}
