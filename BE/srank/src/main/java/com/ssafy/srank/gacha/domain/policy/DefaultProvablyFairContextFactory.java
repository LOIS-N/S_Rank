package com.ssafy.srank.gacha.domain.policy;

import com.ssafy.srank.gacha.domain.enums.ProofAlgorithmVersion;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.HexFormat;

@Component
public class DefaultProvablyFairContextFactory implements ProvablyFairContextFactory {

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public ProvablyFairContext create() {
        String serverSeed = nextHex(32);
        return new ProvablyFairContext(
                serverSeed,
                ProofAlgorithmVersion.PF_V1
        );
    }

    private String nextHex(int bytes) {
        byte[] buffer = new byte[bytes];
        secureRandom.nextBytes(buffer);
        return HexFormat.of().formatHex(buffer);
    }
}
