package com.ssafy.srank.blockchain.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.blockchain")
public class BlockchainProperties {

    private String rpcUrl;
    private String privateKey;
    private String ledgerAddress;
    private String cardNftAddress;
    private String cardMarketAddress;
    private String gameTokenAddress;
    private int retryMax = 3;

    /**
     * Ledger 컨트랙트 연동 가용성 확인.
     * GACHA / SYNTHESIS / ENHANCE 처리 전 체크한다.
     */
    public boolean isLedgerConfigured() {
        return StringUtils.hasText(rpcUrl)
                && StringUtils.hasText(privateKey)
                && StringUtils.hasText(ledgerAddress);
    }

    /**
     * NFT 컨트랙트 연동 가용성 확인.
     * NFT_MINT / P2P_TRANSFER 처리 전 체크한다.
     */
    public boolean isNftConfigured() {
        return StringUtils.hasText(rpcUrl)
                && StringUtils.hasText(privateKey)
                && StringUtils.hasText(cardNftAddress)
                && StringUtils.hasText(cardMarketAddress);
    }

    /**
     * GameToken 컨트랙트 연동 가용성 확인.
     * 업적 보상(mintReward) 또는 별도 토큰 결제(transfer) 전 체크한다.
     */
    public boolean isTokenConfigured() {
        return StringUtils.hasText(rpcUrl)
                && StringUtils.hasText(privateKey)
                && StringUtils.hasText(gameTokenAddress);
    }

    /**
     * @deprecated isLedgerConfigured() / isNftConfigured() / isTokenConfigured() 를 목적에 맞게 사용할 것.
     * 기존 호출부가 있다면 isLedgerConfigured() 로 교체한다.
     */
    @Deprecated
    public boolean isConfigured() {
        return isLedgerConfigured();
    }
}
