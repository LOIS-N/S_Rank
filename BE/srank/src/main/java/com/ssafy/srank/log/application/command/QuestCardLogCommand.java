package com.ssafy.srank.log.application.command;

public record QuestCardLogCommand(
        Long userCardId,
        String skillType1,
        int skillValue1,
        String skillType2,
        int skillValue2,
        String skillType3,
        int skillValue3,
        String specialSkillCode,
        String specialSkillType,
        Integer specialSkillValue
) {
}
