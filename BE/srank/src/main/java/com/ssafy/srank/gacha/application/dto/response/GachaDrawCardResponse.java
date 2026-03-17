package com.ssafy.srank.gacha.application.dto.response;

import com.ssafy.srank.card.application.dto.response.CardSkillResponse;
import com.ssafy.srank.card.application.dto.response.SpecialAbilityResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;

public record GachaDrawCardResponse(
        Long cardId,
        String grade,
        String name,
        String imageUrl,
        CardSkillResponse skill1,
        CardSkillResponse skill2,
        CardSkillResponse skill3,
        SpecialAbilityResponse specialAbility
) {

    public static GachaDrawCardResponse from(UserCardResponse response) {
        return new GachaDrawCardResponse(
                response.cardId(),
                response.grade(),
                response.name(),
                response.imageUrl(),
                response.skill1(),
                response.skill2(),
                response.skill3(),
                response.specialAbility()
        );
    }
}
