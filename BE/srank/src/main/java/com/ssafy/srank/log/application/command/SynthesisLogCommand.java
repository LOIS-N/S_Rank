package com.ssafy.srank.log.application.command;

import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.common.probablyfair.domain.ProofAlgorithmVersion;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;

import java.time.LocalDateTime;
import java.util.List;

public record SynthesisLogCommand(
        Long userId,
        List<Long> sourceUserCardIds,
        Long resultUserCardId,
        boolean success,
        int costGold,
        CardGrade sourceCardGrade,
        String clientSeed,
        String serverSeed,
        ProofAlgorithmVersion algorithmVersion,
        String policyVersion,
        int resultRoll,
        String resultDigest,
        BlockchainStatus blockchainStatus,
        String blockchainTxHash,
        LocalDateTime createdAt
) {
}
