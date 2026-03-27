package com.ssafy.srank.blockchain.config;

import com.ssafy.srank.blockchain.application.service.LedgerWriteService;
import com.ssafy.srank.blockchain.contracts.Ledger;
import com.ssafy.srank.common.metrics.BlockchainMetrics;
import java.math.BigInteger;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.StaticGasProvider;

@Configuration
public class BlockchainConfig {

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key", "ledger-address"}
    )
    public Web3j web3j(BlockchainProperties properties) {
        return Web3j.build(new HttpService(properties.getRpcUrl()));
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key", "ledger-address"}
    )
    public Credentials blockchainCredentials(BlockchainProperties properties) {
        return Credentials.create(properties.getPrivateKey());
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key", "ledger-address"}
    )
    public ContractGasProvider blockchainGasProvider() {
        return new StaticGasProvider(
                BigInteger.ZERO,
                BigInteger.valueOf(5_000_000)
        );
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key", "ledger-address"}
    )
    public Ledger ledger(
            BlockchainProperties properties,
            Web3j web3j,
            Credentials blockchainCredentials,
            ContractGasProvider blockchainGasProvider
    ) {
        return Ledger.load(
                properties.getLedgerAddress(),
                web3j,
                blockchainCredentials,
                blockchainGasProvider
        );
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key", "ledger-address"}
    )
    public LedgerWriteService ledgerWriteService(Ledger ledger, BlockchainMetrics blockchainMetrics) {
        return new LedgerWriteService(ledger, blockchainMetrics);
    }
}
