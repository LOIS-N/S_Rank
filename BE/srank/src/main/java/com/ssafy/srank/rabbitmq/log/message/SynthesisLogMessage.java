package com.ssafy.srank.rabbitmq.log.message;

import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.common.probablyfair.domain.ProofAlgorithmVersion;

import java.time.LocalDateTime;

/**
 * 합성 로그 메시지
 * SynthesisLog 엔티티 컬럼 기준으로 구성
 */
public record SynthesisLogMessage(
        Long userId,
        Long resultUserCardId,
        boolean success,
        int costGold,
        Long sourceUserCardId1,
        Long sourceUserCardId2,
        Long sourceUserCardId3,
        Long sourceUserCardId4,
        Long sourceUserCardId5,
        CardGrade sourceCardGrade,
        String clientSeed,
        String serverSeed,
        ProofAlgorithmVersion algorithmVersion,
        String policyVersion,
        int resultRoll,
        String resultDigest,
        LocalDateTime createdAt
) {}
