package com.ssafy.srank.common.probablyfair.application.service;

import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairPurpose;
import com.ssafy.srank.common.probablyfair.domain.ProofAlgorithmVersion;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class ProbablyFairServiceImpl implements ProbablyFairService {

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public ProbablyFairContext issueContext() {
        // 요청마다 독립적인 server seed를 새로 발급, 알고리즘 버전은 일단 PF_V1으로 고정
        return new ProbablyFairContext(nextHex(32), ProofAlgorithmVersion.PF_V1);
    }

    // 해시 결과를 정수로 변경
    @Override
    public int roll(
            ProbablyFairContext context,
            String clientSeed,
            int drawIndex,
            ProbablyFairPurpose purpose,
            int bound
    ) {
        if (bound <= 0) {
            throw new IllegalArgumentException("bound must be positive");
        }

        // purpose를 포함해 같은 seed 조합 안에서도 각 단계 roll이 서로 섞이지 않게 분리한다.
        byte[] digest = hmacSha256(
                context.serverSeed(),
                clientSeed + ":" + drawIndex + ":" + purpose.proofKey()
        );
        return new BigInteger(1, digest).mod(BigInteger.valueOf(bound)).intValue();
    }

    // 검증용 해시 생성
    @Override
    public String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    // 서버 시드 생성
    private String nextHex(int bytes) {
        byte[] buffer = new byte[bytes];
        secureRandom.nextBytes(buffer);
        return HexFormat.of().formatHex(buffer);
    }

    // Probably Fair 랜덤 계산
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
