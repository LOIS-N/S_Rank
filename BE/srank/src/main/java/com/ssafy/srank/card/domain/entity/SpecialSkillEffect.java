package com.ssafy.srank.card.domain.entity;
import com.ssafy.srank.card.domain.enums.*;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "special_skill_effect")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SpecialSkillEffect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "special_skill_effect_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "special_skill_id", nullable = false)
    private SpecialSkillTemplate specialSkillTemplate;

    @Enumerated(EnumType.STRING)
    @Column(name = "effect_type", nullable = false, length = 50)
    private EffectType effectType;

    @Enumerated(EnumType.STRING)
    @Column(name = "effect_operator", nullable = false, length = 20)
    private EffectOperator effectOperator;

    @Column(name = "effect_amount")
    private Integer effectAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_scope", nullable = false, length = 50)
    private TargetScope targetScope;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_position", length = 20)
    private PositionType targetPosition;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false, length = 50)
    private ConditionType conditionType;

    @Column(name = "condition_value")
    private Integer conditionValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_position", length = 20)
    private PositionType conditionPosition;

    @Column(name = "priority", nullable = false)
    private int priority;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public SpecialSkillEffect(
            EffectType effectType,
            EffectOperator effectOperator,
            Integer effectAmount,
            TargetScope targetScope,
            PositionType targetPosition,
            ConditionType conditionType,
            Integer conditionValue,
            PositionType conditionPosition,
            int priority
    ) {
        this.effectType = effectType;
        this.effectOperator = effectOperator;
        this.effectAmount = effectAmount;
        this.targetScope = targetScope;
        this.targetPosition = targetPosition;
        this.conditionType = conditionType;
        this.conditionValue = conditionValue;
        this.conditionPosition = conditionPosition;
        this.priority = priority;
        this.active = true;
        this.createdAt = LocalDateTime.now();
    }

    void assignTemplate(SpecialSkillTemplate specialSkillTemplate) {
        this.specialSkillTemplate = specialSkillTemplate;
    }
}