package com.ssafy.srank.market.application.dto.response;

import java.time.LocalDateTime;

public record SellableCardResponse(
        Long userCardId,
        Long cardTemplateId,
        String cardName,
        String imageUrl,
        SkillResponse skill1,
        SkillResponse skill2,
        SkillResponse skill3,
        String specialAbility,
        Integer enhanceTryCount,
        Integer enhanceSuccessCount,
        String grade
//        LocalDateTime createdAt,
//        LocalDateTime expiresAt
) {
}