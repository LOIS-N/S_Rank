package com.ssafy.srank.card.domain.enums;

public enum EffectType {

    // 수행 속도 관련
    WORK_SPEED,

    // 퀘스트 전체 시간 감소
    QUEST_TOTAL_TIME_REDUCE,

    // 퀘스트 보상 관련
    QUEST_REWARD_GOLD,
    QUEST_REWARD_PERCENT,

    // 오버스펙 패널티
    OVER_SPEC_PENALTY_REDUCTION,

    // 강화 성공률
    ENHANCE_SUCCESS_RATE_UP,

    // 스탯 증가
    ALL_STATS_UP,

    // 지원 스탯 증가
    SUPPORT_STAT
}