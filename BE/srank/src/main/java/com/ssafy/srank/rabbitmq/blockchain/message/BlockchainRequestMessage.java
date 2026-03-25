package com.ssafy.srank.rabbitmq.blockchain.message;

import com.ssafy.srank.gacha.domain.enums.GachaType;

import java.util.List;

public record BlockchainRequestMessage(
        BlockchainEventType eventType,
        List<Long> logIds,
        String walletAddress,
        String clientSeed,
        String serverSeed,
        Integer count,
        GachaType gachaType,
        List<Long> consumedCardIds,
        int retryCount
) {

    public static BlockchainRequestMessage forGacha(
            List<Long> logIds,
            String walletAddress,
            String clientSeed,
            String serverSeed,
            int count,
            GachaType gachaType
    ) {
        return new BlockchainRequestMessage(
                BlockchainEventType.GACHA,
                logIds,
                walletAddress,
                clientSeed,
                serverSeed,
                count,
                gachaType,
                List.of(),
                0
        );
    }

    public static BlockchainRequestMessage forSynthesis(
            Long logId,
            String walletAddress,
            List<Long> consumedCardIds
    ) {
        return new BlockchainRequestMessage(
                BlockchainEventType.SYNTHESIS,
                List.of(logId),
                walletAddress,
                null,
                null,
                null,
                null,
                consumedCardIds,
                0
        );
    }

    public BlockchainRequestMessage incrementRetry() {
        return new BlockchainRequestMessage(
                eventType,
                logIds,
                walletAddress,
                clientSeed,
                serverSeed,
                count,
                gachaType,
                consumedCardIds,
                retryCount + 1
        );
    }
}
