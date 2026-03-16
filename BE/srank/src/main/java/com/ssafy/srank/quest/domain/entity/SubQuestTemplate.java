package com.ssafy.srank.quest.domain.entity;

import com.ssafy.srank.common.entity.SoftDeleteEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "sub_quest_template")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class SubQuestTemplate extends SoftDeleteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sub_quest_template_id")
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "difficulty", nullable = false)
    private int difficulty;

    // 요구 스킬 1
    @Column(name = "required_skill_type_1", nullable = false, length = 10)
    private String requiredSkillType1;

    @Column(name = "required_skill_value_1", nullable = false)
    private int requiredSkillValue1;

    // 요구 스킬 2
    @Column(name = "required_skill_type_2", nullable = false, length = 10)
    private String requiredSkillType2;

    @Column(name = "required_skill_value_2", nullable = false)
    private int requiredSkillValue2;

    // 요구 스킬 3
    @Column(name = "required_skill_type_3", nullable = false, length = 10)
    private String requiredSkillType3;

    @Column(name = "required_skill_value_3", nullable = false)
    private int requiredSkillValue3;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "card_slot_count", nullable = false)
    private int cardSlotCount;

    @Column(name = "reward_gold", nullable = false)
    private int rewardGold;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "quest_date")
    private LocalDateTime questDate;
}
