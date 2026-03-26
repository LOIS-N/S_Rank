package com.ssafy.srank.market.application.dto.response;

public record SkillResponse(
        String skillType,
        Integer value,
        Integer bonus
) {
}