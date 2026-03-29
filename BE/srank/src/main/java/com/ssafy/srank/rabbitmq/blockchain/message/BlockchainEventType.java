package com.ssafy.srank.rabbitmq.blockchain.message;

public enum BlockchainEventType {
    GACHA,
    SYNTHESIS,
    ENHANCE,

    /** 판매 등록 시 NFT 발급 요청 */
    NFT_MINT,

    /** 구매 시 NFT 소유권 이전 + 토큰 P2P 이전 요청 */
    P2P_TRANSFER,
    MISSION_REWARD
}
