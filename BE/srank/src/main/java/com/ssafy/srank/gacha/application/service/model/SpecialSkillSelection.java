package com.ssafy.srank.gacha.application.service.model;

import com.ssafy.srank.card.domain.entity.SpecialSkillTemplate;

public record SpecialSkillSelection(
        SpecialSkillTemplate specialSkillTemplate,
        Integer skillRoll
) {
}
