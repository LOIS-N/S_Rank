package com.ssafy.srank.blockchain.config;

import com.ssafy.srank.blockchain.application.service.LedgerWriteService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlockchainStartupDiagnostics {

    private final ConfigurableEnvironment environment;
    private final BlockchainProperties blockchainProperties;
    private final ObjectProvider<LedgerWriteService> ledgerWriteServiceProvider;

    @EventListener(ApplicationReadyEvent.class)
    public void logBlockchainConfigurationStatus() {
        Path dotenvPath = Paths.get(".env").toAbsolutePath().normalize();
        boolean dotenvExists = Files.exists(dotenvPath);
        boolean rpcUrlConfigured = StringUtils.hasText(blockchainProperties.getRpcUrl());
        boolean privateKeyConfigured = StringUtils.hasText(blockchainProperties.getPrivateKey());
        boolean ledgerAddressConfigured = StringUtils.hasText(blockchainProperties.getLedgerAddress());
        boolean ledgerWriteServiceAvailable = ledgerWriteServiceProvider.getIfAvailable() != null;

        log.info(
                "blockchain startup diagnostics activeProfiles={} dotenvPath={} dotenvExists={} configured={} ledgerWriteServiceAvailable={}",
                List.of(environment.getActiveProfiles()),
                dotenvPath,
                dotenvExists,
                blockchainProperties.isConfigured(),
                ledgerWriteServiceAvailable
        );

        log.info(
                "blockchain property status rpcUrlConfigured={} privateKeyConfigured={} ledgerAddressConfigured={} rpcUrlSources={} privateKeySources={} appRpcUrlSources={} appPrivateKeySources={}",
                rpcUrlConfigured,
                privateKeyConfigured,
                ledgerAddressConfigured,
                findPropertySources("RPC_URL"),
                findPropertySources("PRIVATE_KEY"),
                findPropertySources("app.blockchain.rpc-url"),
                findPropertySources("app.blockchain.private-key")
        );
    }

    private List<String> findPropertySources(String propertyName) {
        List<String> sources = new ArrayList<>();
        for (PropertySource<?> propertySource : environment.getPropertySources()) {
            if (propertySource.containsProperty(propertyName)) {
                sources.add(propertySource.getName());
            }
        }
        return sources;
    }
}
