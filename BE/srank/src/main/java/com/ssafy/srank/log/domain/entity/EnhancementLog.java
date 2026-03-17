package com.ssafy.srank.log.domain.entity;

import com.ssafy.srank.card.domain.enums.PositionType;
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
@Table(name = "enhancement_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class EnhancementLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "enhancement_log")
    private Long enhancementLogId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_card_id", nullable = false)
    private Long userCardId;

    @Column(name = "try_no", nullable = false)
    private int tryNo;

    @Column(name = "success", nullable = false)
    private boolean success;

    @Column(name = "before_success_count", nullable = false)
    private int beforeSuccessCount;

    @Column(name = "after_success_count", nullable = false)
    private int afterSuccessCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "increased_skill_type1", length = 10)
    private PositionType increasedSkillType1;

    @Column(name = "increased_amount1", nullable = false)
    private int increasedAmount1;

    @Enumerated(EnumType.STRING)
    @Column(name = "increased_skill_type2", length = 10)
    private PositionType increasedSkillType2;

    @Column(name = "increased_amount2", nullable = false)
    private int increasedAmount2;

    @Enumerated(EnumType.STRING)
    @Column(name = "increased_skill_type3", length = 10)
    private PositionType increasedSkillType3;

    @Column(name = "increased_amount3", nullable = false)
    private int increasedAmount3;

    @Column(name = "cost_gold", nullable = false)
    private long costGold;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
