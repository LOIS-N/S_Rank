package com.ssafy.srank.card.application.dto.response;

import com.ssafy.srank.card.domain.enums.PositionType;

public record CardSkillResponse(
        PositionType skillType,
        int value
) {
}