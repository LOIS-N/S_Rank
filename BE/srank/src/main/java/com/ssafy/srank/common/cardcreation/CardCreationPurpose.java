package com.ssafy.srank.common.cardcreation;

import com.ssafy.srank.card.domain.enums.CardGrade;

public final class CardCreationPurpose {

    private CardCreationPurpose() {
    }

    /**
     * 템플릿 선택
     */
    public static String template(CardGrade grade) {
        return "TEMPLATE_" + grade.name();
    }

    /**
     * 스탯 포지션 선택
     */
    public static String position(int index) {
        return "POSITION_" + index;
    }

    /**
     * 스탯 값 선택
     */
    public static String stat(int index) {
        return "STAT_" + index;
    }

    /**
     * S급 특수능력 지급 여부를 판정
     */
    public static String specialSkillGranted() {
        return "SPECIAL_SKILL_GRANTED";
    }

    /**
     * 특수능력 템플릿을 선택
     */
    public static String specialSkill() {
        return "SKILL";
    }
}
