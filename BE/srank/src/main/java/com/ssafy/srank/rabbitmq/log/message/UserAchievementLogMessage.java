package com.ssafy.srank.rabbitmq.log.message;

import java.time.LocalDateTime;

/**
 * 업적 로그 메시지
 * UserAchievementLog 엔티티 컬럼 기준으로 구성
 */
public record UserAchievementLogMessage(
        Long userId,
        Long achievementTemplateId,
        boolean rewardClaimed,
        LocalDateTime claimedAt,
        LocalDateTime createdAt
) {}
