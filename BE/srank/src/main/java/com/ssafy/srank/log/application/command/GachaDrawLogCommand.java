package com.ssafy.srank.log.application.command;

import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.gacha.domain.enums.ProofAlgorithmVersion;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;

import java.time.LocalDateTime;
import java.util.List;

public record GachaDrawLogCommand(
        Long userId,
        GachaType gachaType,
        int drawCount,
        long totalCost,
        String clientSeed,
        String serverSeed,
        ProofAlgorithmVersion algorithmVersion,
        String anchorPayload,
        BlockchainStatus blockchainStatus,
        String blockchainTxHash,
        boolean tutorial,
        List<GachaDrawnCardLogCommand> drawnCards,
        LocalDateTime createdAt
) {
}
