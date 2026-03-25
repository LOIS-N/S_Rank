package com.ssafy.srank.rabbitmq.log.message;

import com.ssafy.srank.card.domain.enums.PositionType;

import java.time.LocalDateTime;

/**
 * 강화 로그 메시지
 * EnhancementLog 엔티티 컬럼 기준으로 구성
 */
public record EnhanceLogMessage(
        Long userId,
        Long userCardId,
        int tryNo,
        boolean success,
        int beforeSuccessCount,
        int afterSuccessCount,
        PositionType increasedSkillType1,
        int increasedAmount1,
        PositionType increasedSkillType2,
        int increasedAmount2,
        PositionType increasedSkillType3,
        int increasedAmount3,
        long costGold,
        LocalDateTime createdAt
) {}
