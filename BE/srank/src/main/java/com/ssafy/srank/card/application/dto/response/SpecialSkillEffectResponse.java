package com.ssafy.srank.card.application.dto.response;

import com.ssafy.srank.card.domain.enums.*;

public record SpecialSkillEffectResponse(
        EffectType effectType,
        EffectOperator effectOperator,
        Integer effectAmount,
        TargetScope targetScope,
        PositionType targetPosition,
        ConditionType conditionType,
        Integer conditionValue,
        PositionType conditionPosition,
        int priority
) {}
