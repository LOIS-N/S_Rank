package com.ssafy.srank.gacha.domain.policy;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Component
public class ProvablyFairCalculator {

    /**
     * 같은 입력이면 항상 같은 롤이 나오도록 서버 시드를 HMAC 키로 사용한다.
     */
    public int roll(
            String serverSeed,
            String clientSeed,
            String requestNonce,
            int drawIndex,
            String purpose,
            int bound
    ) {
        if (bound <= 0) {
            throw new IllegalArgumentException("bound must be positive");
        }
        byte[] digest = hmacSha256(serverSeed, clientSeed + ":" + requestNonce + ":" + drawIndex + ":" + purpose);
        return new BigInteger(1, digest).mod(BigInteger.valueOf(bound)).intValue();
    }

    public String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private byte[] hmacSha256(String key, String message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate HMAC-SHA256", e);
        }
    }
}
