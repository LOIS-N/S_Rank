package com.ssafy.srank.card.application.dto.response;

import com.ssafy.srank.card.domain.enums.PositionType;

public record UserCardFlatResponse(
        Long cardId,
        String grade,
        String name,
        String imageUrl,

        PositionType skillType1,
        int skillValue1,

        PositionType skillType2,
        int skillValue2,

        PositionType skillType3,
        int skillValue3,

        String specialAbility
) {
    public UserCardResponse toResponse() {
        return new UserCardResponse(
                cardId,
                grade,
                name,
                imageUrl,
                new CardSkillResponse(skillType1, skillValue1),
                new CardSkillResponse(skillType2, skillValue2),
                new CardSkillResponse(skillType3, skillValue3),
                specialAbility
        );
    }
}