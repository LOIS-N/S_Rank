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
    private int retryMax = 3;

    public boolean isConfigured() {
        return StringUtils.hasText(rpcUrl)
                && StringUtils.hasText(privateKey)
                && StringUtils.hasText(ledgerAddress);
    }
}
