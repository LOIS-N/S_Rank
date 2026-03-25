package com.ssafy.srank.card.application.dto.response;

public record UserCardResponse(
        Long cardId,
        String grade,
        String name,
        String imageUrl,
        CardSkillResponse skill1,
        CardSkillResponse skill2,
        CardSkillResponse skill3,
        int enhanceTryCount,
        int enhanceSuccessCount,
        SpecialAbilityResponse specialAbility
) {}
