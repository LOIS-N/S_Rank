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
@Table(name = "gacha_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class GachaLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gacha_draw_id")
    private Long gachaDrawId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "gacha_type", nullable = false, length = 10)
    private String gachaType;

    @Column(name = "draw_count", nullable = false)
    private int drawCount;

    @Column(name = "user_card_id", nullable = false)
    private Long userCardId;

    @Enumerated(EnumType.STRING)
    @Column(name = "Field", nullable = false, length = 1)
    private CardGrade grade;

    @Column(name = "cost_gold", nullable = false)
    private int costGold;

    @Builder.Default
    @Column(name = "is_tutorial", nullable = false)
    private boolean tutorial = false;

    @Column(name = "skill_type1", nullable = false, length = 10)
    private String skillType1;

    @Column(name = "skill_value1", nullable = false)
    private int skillValue1;

    @Column(name = "skill_type2", nullable = false, length = 10)
    private String skillType2;

    @Column(name = "skill_value2", nullable = false)
    private int skillValue2;

    @Column(name = "skill_type3", nullable = false, length = 10)
    private String skillType3;

    @Column(name = "skill_value3", nullable = false)
    private int skillValue3;

    @Column(name = "special_skill_code", length = 30)
    private String specialSkillCode;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
