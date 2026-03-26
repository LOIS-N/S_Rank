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

    /** 판매 등록 시 NFT_MINT 이벤트 생성 */
    public static BlockchainRequestMessage forNftMint(
            Long marketItemId,
            Long userCardId,
            String sellerWalletAddress
    ) {
        return new BlockchainRequestMessage(
                BlockchainEventType.NFT_MINT,
                sellerWalletAddress,
                null,           // clientSeed - market은 불필요
                null,           // serverSeed - market은 불필요
                null,           // count - market은 불필요
                null,           // gachaType - market은 불필요
                List.of(marketItemId, userCardId),  // marketItemId, userCardId 순서로 전달
                0
        );
    }

    /** 구매 시 P2P_TRANSFER 이벤트 생성 */
    public static BlockchainRequestMessage forP2pTransfer(
            Long marketItemId,
            Long userCardId,
            String sellerWalletAddress,
            String buyerWalletAddress,
            Long priceCoin
    ) {
        return new BlockchainRequestMessage(
                BlockchainEventType.P2P_TRANSFER,
                buyerWalletAddress,  // 구매자 지갑 (토큰 차감 주체)
                sellerWalletAddress, // clientSeed 필드 임시 재활용 - 판매자 지갑
                String.valueOf(priceCoin), // serverSeed 필드 임시 재활용 - 코인 금액
                null,
                null,
                List.of(marketItemId, userCardId),
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
