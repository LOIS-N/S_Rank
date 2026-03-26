package com.ssafy.srank.rabbitmq.blockchain.message;

import com.ssafy.srank.gacha.domain.enums.GachaType;

import java.util.List;

public record BlockchainRequestMessage(
        BlockchainEventType eventType,
        String walletAddress,
        String clientSeed,
        String serverSeed,
        Integer count,
        GachaType gachaType,
        List<Long> consumedCardIds,
        int retryCount
) {

    public static BlockchainRequestMessage forGacha(
            String walletAddress,
            String clientSeed,
            String serverSeed,
            int count,
            GachaType gachaType
    ) {
        return new BlockchainRequestMessage(
                BlockchainEventType.GACHA,
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
            String walletAddress,
            String clientSeed,
            String serverSeed,
            List<Long> consumedCardIds
    ) {
        return new BlockchainRequestMessage(
                BlockchainEventType.SYNTHESIS,
                walletAddress,
                clientSeed,
                serverSeed,
                null,
                null,
                consumedCardIds,
                0
        );
    }

    public static BlockchainRequestMessage forEnhance(
            String clientSeed,
            String serverSeed,
            String walletAddress,
            List<Long> consumedCardIds
    ) {
        return new BlockchainRequestMessage(
                BlockchainEventType.ENHANCE,
                walletAddress,
                clientSeed,
                serverSeed,
                null,
                null,
                consumedCardIds,
                0
        );
    }

    public BlockchainRequestMessage incrementRetry() {
        return new BlockchainRequestMessage(
                eventType,
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
