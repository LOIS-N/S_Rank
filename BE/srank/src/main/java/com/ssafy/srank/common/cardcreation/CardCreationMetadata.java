package com.ssafy.srank.common.cardcreation;

public record CardCreationMetadata(
        int templateRoll,
        Integer skillRoll,
        Long selectedTemplateId,
        String selectedSpecialSkillCode
) {
}
