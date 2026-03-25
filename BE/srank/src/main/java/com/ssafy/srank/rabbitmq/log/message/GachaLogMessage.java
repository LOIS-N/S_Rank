package com.ssafy.srank.rabbitmq.log.message;

import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.common.probablyfair.domain.ProofAlgorithmVersion;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;

import java.time.LocalDateTime;

/**
 * 뽑기 로그 메시지
 * GachaLog 엔티티 컬럼 기준으로 구성
 */
public record GachaLogMessage(
        Long userId,
        GachaType gachaType,
        int drawCount,
        int drawIndex,
        Long userCardId,
        Long cardTemplateId,
        CardGrade grade,
        int gradeRoll,
        int templateRoll,
        Integer skillRoll,
        int costGold,
        boolean tutorial,
        String skillType1,
        int skillValue1,
        String skillType2,
        int skillValue2,
        String skillType3,
        int skillValue3,
        String specialSkillCode,
        String clientSeed,
        String serverSeed,
        ProofAlgorithmVersion algorithmVersion,
        String anchorPayload,
        BlockchainStatus blockchainStatus,
        String blockchainTxHash,
        LocalDateTime createdAt
) {}
