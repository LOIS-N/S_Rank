package com.ssafy.srank.gacha.application.dto.response;

import com.ssafy.srank.card.domain.enums.CardGrade;

public record GachaDrawProofItemResponse(
        int drawIndex,
        int gradeRoll,
        int templateRoll,
        Integer skillRoll,
        CardGrade selectedGrade,
        Long selectedTemplateId,
        String selectedSpecialSkillCode
) {
}
