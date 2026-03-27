package com.ssafy.srank.auth.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.srank.common.config.PrivyProperties;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.metrics.AuthMetrics;
import com.ssafy.srank.common.metrics.BusinessExceptionMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PrivyTokenServiceImpl implements PrivyTokenService {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String ETHEREUM_CHAIN = "ethereum";
    private static final String OPERATION_VERIFY_ACCESS_TOKEN = "auth.verify_access_token";
    private static final String OPERATION_VERIFY_IDENTITY_TOKEN = "auth.verify_identity_token";

    private final PrivyProperties privyProperties;
    private final ObjectMapper objectMapper;
    private final AuthMetrics authMetrics;
    private final BusinessExceptionMetrics businessExceptionMetrics;

    private volatile PublicKey verificationKey;

    @Override
    public String verifyAccessToken(String authorizationHeader) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            String token = extractBearerToken(authorizationHeader);
            Claims claims = parseClaims(token);
            return readPrivyId(claims);
        } catch (BusinessException e) {
            result = MetricTagValues.RESULT_FAILURE;
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record(OPERATION_VERIFY_ACCESS_TOKEN, e);
            throw e;
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            authMetrics.recordTokenValidation(System.nanoTime() - startNanos, "access", result, errorCode);
        }
    }

    @Override
    public PrivyIdentity verifyIdentityToken(String identityToken) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            Claims claims = parseClaims(identityToken);
            String privyId = readPrivyId(claims);
            List<Map<String, Object>> linkedAccounts = parseLinkedAccounts(claims.get("linked_accounts"));

            String email = linkedAccounts.stream()
                    .filter(account -> "email".equals(account.get("type")) || "google_oauth".equals(account.get("type")))
                    .map(account -> {
                        Object emailValue = account.get("email");
                        return emailValue != null ? stringValue(emailValue) : stringValue(account.get("address"));
                    })
                    .filter(StringUtils::hasText)
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(ErrorCode.TOKEN_INVALID));

            String walletAddress = linkedAccounts.stream()
                    .filter(account -> ETHEREUM_CHAIN.equalsIgnoreCase(stringValue(account.get("chain_type"))))
                    .map(account -> stringValue(account.get("address")))
                    .filter(StringUtils::hasText)
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(ErrorCode.TOKEN_INVALID));

            return new PrivyIdentity(privyId, email, walletAddress);
        } catch (BusinessException e) {
            result = MetricTagValues.RESULT_FAILURE;
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record(OPERATION_VERIFY_IDENTITY_TOKEN, e);
            throw e;
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            authMetrics.recordTokenValidation(System.nanoTime() - startNanos, "identity", result, errorCode);
        }
    }

    private Claims parseClaims(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getVerificationKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            validateStandardClaims(claims);
            return claims;
        } catch (ExpiredJwtException e) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
    }

    private void validateStandardClaims(Claims claims) {
        if (!privyProperties.getIssuer().equals(claims.getIssuer())) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }

        if (!privyProperties.getAppId().equals(claims.getAudience())) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
    }

    private String extractBearerToken(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return authorizationHeader.substring(BEARER_PREFIX.length()).trim();
    }

    private String readPrivyId(Claims claims) {
        String privyId = claims.getSubject();
        if (!StringUtils.hasText(privyId) || !privyId.startsWith("did:privy:")) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return privyId;
    }

    private List<Map<String, Object>> parseLinkedAccounts(@Nullable Object linkedAccountsClaim) {
        if (linkedAccountsClaim == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }

        try {
            if (linkedAccountsClaim instanceof String linkedAccountsJson) {
                return objectMapper.readValue(linkedAccountsJson, new TypeReference<>() {
                });
            }
            return objectMapper.convertValue(linkedAccountsClaim, new TypeReference<>() {
            });
        } catch (IllegalArgumentException | JsonProcessingException e) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
    }

    private String stringValue(@Nullable Object value) {
        return value instanceof String string ? string : "";
    }

    private PublicKey getVerificationKey() {
        PublicKey currentKey = verificationKey;
        if (currentKey != null) {
            return currentKey;
        }

        synchronized (this) {
            if (verificationKey == null) {
                verificationKey = parseVerificationKey(privyProperties.getVerificationKey());
            }
            return verificationKey;
        }
    }

    private PublicKey parseVerificationKey(String rawKey) {
        try {
            String normalizedKey = rawKey
                    .trim()
                    .replace("\\n", "\n")
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s", "");

            if (!StringUtils.hasText(normalizedKey)) {
                throw new IllegalArgumentException("Privy verification key is blank");
            }

            byte[] keyBytes = Base64.getDecoder().decode(normalizedKey);
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(keyBytes);
            return KeyFactory.getInstance("EC").generatePublic(keySpec);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse Privy verification key", e);
        }
    }
}
