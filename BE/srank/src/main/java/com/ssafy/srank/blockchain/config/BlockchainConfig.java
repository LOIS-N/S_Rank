package com.ssafy.srank.blockchain.config;

import com.ssafy.srank.blockchain.application.service.LedgerWriteService;
import com.ssafy.srank.blockchain.application.service.NftWriteService;
import com.ssafy.srank.blockchain.application.service.TokenWriteService;
import com.ssafy.srank.blockchain.contracts.CardMarket;
import com.ssafy.srank.blockchain.contracts.CardNFT;
import com.ssafy.srank.blockchain.contracts.GameToken;
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
            name = {"rpc-url", "private-key"}
    )
    public Web3j web3j(BlockchainProperties properties) {
        return Web3j.build(new HttpService(properties.getRpcUrl()));
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key"}
    )
    public Credentials blockchainCredentials(BlockchainProperties properties) {
        return Credentials.create(properties.getPrivateKey());
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key"}
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

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key", "card-nft-address"}
    )
    public CardNFT cardNft(
            BlockchainProperties properties,
            Web3j web3j,
            Credentials blockchainCredentials,
            ContractGasProvider blockchainGasProvider
    ) {
        return CardNFT.load(
                properties.getCardNftAddress(),
                web3j,
                blockchainCredentials,
                blockchainGasProvider
        );
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key", "card-market-address"}
    )
    public CardMarket cardMarket(
            BlockchainProperties properties,
            Web3j web3j,
            Credentials blockchainCredentials,
            ContractGasProvider blockchainGasProvider
    ) {
        return CardMarket.load(
                properties.getCardMarketAddress(),
                web3j,
                blockchainCredentials,
                blockchainGasProvider
        );
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key", "game-token-address"}
    )
    public GameToken gameToken(
            BlockchainProperties properties,
            Web3j web3j,
            Credentials blockchainCredentials,
            ContractGasProvider blockchainGasProvider
    ) {
        return GameToken.load(
                properties.getGameTokenAddress(),
                web3j,
                blockchainCredentials,
                blockchainGasProvider
        );
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key", "card-nft-address", "card-market-address"}
    )
    public NftWriteService nftWriteService(
            CardNFT cardNft,
            CardMarket cardMarket,
            BlockchainMetrics blockchainMetrics
    ) {
        return new NftWriteService(cardNft, cardMarket, blockchainMetrics);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.blockchain",
            name = {"rpc-url", "private-key", "game-token-address"}
    )
    public TokenWriteService tokenWriteService(
            GameToken gameToken,
            BlockchainMetrics blockchainMetrics
    ) {
        return new TokenWriteService(gameToken, blockchainMetrics);
    }
}
