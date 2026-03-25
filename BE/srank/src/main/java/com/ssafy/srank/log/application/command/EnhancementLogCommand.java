package com.ssafy.srank.log.application.command;

import com.ssafy.srank.card.domain.enums.PositionType;

import java.time.LocalDateTime;

/**
 * 강화 로그 기록에 필요한 데이터를 담는 커맨드 객체.
 * EnhancementLogFacade.record() 호출 시 사용된다.
 *
 * @param userId               강화를 수행한 유저 ID
 * @param userCardId           강화 대상 카드 ID
 * @param tryNo                강화 후 누적 시도 횟수 (강화 전 enhanceTryCount + 1)
 * @param success              강화 성공 여부
 * @param beforeSuccessCount   강화 전 성공 횟수
 * @param afterSuccessCount    강화 후 성공 횟수
 * @param increasedSkillType1  스탯1 타입 (성공/실패 무관하게 카드 원래 타입)
 * @param increasedAmount1     스탯1 증가량 (성공 시 statIncrease, 실패 시 0)
 * @param increasedSkillType2  스탯2 타입
 * @param increasedAmount2     스탯2 증가량
 * @param increasedSkillType3  스탯3 타입
 * @param increasedAmount3     스탯3 증가량
 * @param costGold             소모된 골드
 * @param createdAt            로그 생성 시각
 */
public record EnhancementLogCommand(
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
) {
}
