package com.ssafy.srank.card.domain.enums;

public enum TargetScope {

    // 자기 자신
    SELF,

    // 퀘스트 내 모든 카드
    ALL_CARDS_IN_QUEST,

    // 가장 낮은 스탯 포지션 카드
    LOWEST_STAT_POSITION_CARD,

    // 해당 포지션 카드
    ASSIGNED_POSITION_CARD,

    // 퀘스트 자체
    QUEST,

    // 퀘스트 보상
    QUEST_REWARD
}