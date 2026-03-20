package com.ssafy.srank.log.application.command;

import com.ssafy.srank.card.domain.enums.CardGrade;

public record GachaDrawnCardLogCommand(
        Long userCardId,
        CardGrade grade,
        String skillType1,
        int skillValue1,
        String skillType2,
        int skillValue2,
        String skillType3,
        int skillValue3,
        String specialSkillCode
) {
}
