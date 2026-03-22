package com.ssafy.srank.gacha.domain.policy;

import com.ssafy.srank.gacha.domain.enums.ProofAlgorithmVersion;
import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.UUID;

@Component
public class DefaultProvablyFairContextFactory implements ProvablyFairContextFactory {

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public ProvablyFairContext create() {
        String serverSeed = nextHex(32);
        return new ProvablyFairContext(
                UUID.randomUUID().toString(),
                serverSeed,
                sha256Hex(serverSeed),
                nextHex(16),
                ProofAlgorithmVersion.PF_V1
        );
    }

    private String nextHex(int bytes) {
        byte[] buffer = new byte[bytes];
        secureRandom.nextBytes(buffer);
        return HexFormat.of().formatHex(buffer);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes()));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
