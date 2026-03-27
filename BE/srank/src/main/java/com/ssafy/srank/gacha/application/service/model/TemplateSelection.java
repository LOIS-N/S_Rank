package com.ssafy.srank.gacha.application.service.model;

import com.ssafy.srank.card.domain.entity.CardTemplate;

public record TemplateSelection(
        CardTemplate template,
        int templateRoll
) {
}
