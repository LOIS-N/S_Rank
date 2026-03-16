package com.ssafy.srank.card.domain.enums;

public enum ConditionType {

    // 조건 없음
    NONE,

    // 카드 n장 이상 배치
    CARD_COUNT_AT_LEAST,

    // 기준 시간 이내 완료
    WITHIN_BASE_TIME,

    // 특정 포지션 담당 시
    WHEN_ASSIGNED_TO_POSITION,

    // Overflow 지원 시
    WHEN_SUPPORTING_OVERFLOW,

    // Overflow 없이 단독 수행
    WITHOUT_OVERFLOW_SUPPORT
}