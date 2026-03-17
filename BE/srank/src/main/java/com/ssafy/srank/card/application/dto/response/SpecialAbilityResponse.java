package com.ssafy.srank.card.application.dto.response;

import java.util.List;

public record SpecialAbilityResponse(
        String name,
        String description,
        List<SpecialSkillEffectResponse> effects
) {}
