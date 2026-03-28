package com.ssafy.srank.rabbitmq.blockchain.message;

import com.ssafy.srank.gacha.domain.enums.GachaType;

import java.util.List;

public record BlockchainRequestMessage(
        BlockchainEventType eventType,
        // Ledger 이벤트 필드 (GACHA / SYNTHESIS / ENHANCE)
        String walletAddress,
        String clientSeed,
        String serverSeed,
        Integer count,
        GachaType gachaType,
        List<Long> consumedCardIds,
        // 마켓 이벤트 필드 (NFT_MINT / P2P_TRANSFER)
        Long marketItemId,
        Long userCardId,
        String sellerWallet,
        String buyerWallet,
        Long priceCoin,
        int retryCount,
        Long userId
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
                walletAddress, clientSeed, serverSeed, count, gachaType, List.of(),
                null, null, null, null, null,
                0,null
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
                walletAddress, clientSeed, serverSeed, null, null, consumedCardIds,
                null, null, null, null, null,
                0,null
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
                walletAddress, clientSeed, serverSeed, null, null, consumedCardIds,
                null, null, null, null, null,
                0,null
        );
    }

    /** 판매 등록 시 NFT_MINT 이벤트 생성 */
    public static BlockchainRequestMessage forNftMint(
            Long marketItemId,
            Long userCardId,
            String sellerWallet
    ) {
        return new BlockchainRequestMessage(
                BlockchainEventType.NFT_MINT,
                null, null, null, null, null, List.of(),
                marketItemId, userCardId, sellerWallet, null, null,
                0,null
        );
    }

    /** 구매 시 P2P_TRANSFER 이벤트 생성 */
    public static BlockchainRequestMessage forP2pTransfer(
            Long marketItemId,
            Long userCardId,
            String sellerWallet,
            String buyerWallet,
            Long priceCoin
    ) {
        return new BlockchainRequestMessage(
                BlockchainEventType.P2P_TRANSFER,
                null, null, null, null, null, List.of(),
                marketItemId, userCardId, sellerWallet, buyerWallet, priceCoin,
                0,null
        );
    }

    /** 미션 보상 토큰 지급 이벤트 생성 */
    public static BlockchainRequestMessage forMissionReward(
            String walletAddress,
            Long amount,
            Long userId
    ) {
        return new BlockchainRequestMessage(
                BlockchainEventType.MISSION_REWARD,
                walletAddress, null, null, null, null, List.of(),
                null, null, null, null, amount,
                0,userId
        );
    }

    public BlockchainRequestMessage incrementRetry() {
        return new BlockchainRequestMessage(
                eventType,
                walletAddress, clientSeed, serverSeed, count, gachaType, consumedCardIds,
                marketItemId, userCardId, sellerWallet, buyerWallet, priceCoin,
                retryCount + 1, userId
        );
    }
}
