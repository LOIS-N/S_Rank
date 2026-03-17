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

    // 뽑기로 생성한 UserCard를 프론트가 바로 렌더링할 수 있는 형태로만 축약한다.
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
