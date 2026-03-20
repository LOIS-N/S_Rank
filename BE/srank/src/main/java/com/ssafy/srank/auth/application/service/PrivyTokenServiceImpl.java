package com.ssafy.srank.auth.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.srank.common.config.PrivyProperties;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class PrivyTokenServiceImpl implements PrivyTokenService {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String ETHEREUM_CHAIN = "ethereum";
    private static final String AUTH_TOKEN_TAG = "[AUTH][TOKEN]";

    private final PrivyProperties privyProperties;
    private final ObjectMapper objectMapper;

    private volatile PublicKey verificationKey;

    @Override
    public String verifyAccessToken(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        Claims claims = parseClaims("access", token);
        return readPrivyId(claims);
    }

    @Override
    public PrivyIdentity verifyIdentityToken(String identityToken) {
        Claims claims = parseClaims("identity", identityToken);
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
                .orElseThrow(() -> {
                    log.warn("{} stage=identity.email.missing sub={}", AUTH_TOKEN_TAG, privyId);
                    return new BusinessException(ErrorCode.TOKEN_INVALID);
                });

        String walletAddress = linkedAccounts.stream()
                .filter(account -> ETHEREUM_CHAIN.equalsIgnoreCase(stringValue(account.get("chain_type"))))
                .map(account -> stringValue(account.get("address")))
                .filter(StringUtils::hasText)
                .findFirst()
                .orElseThrow(() -> {
                    log.warn("{} stage=identity.wallet.missing sub={}", AUTH_TOKEN_TAG, privyId);
                    return new BusinessException(ErrorCode.TOKEN_INVALID);
                });

        log.info("{} stage=identity.verified sub={} emailPresent={} walletPresent={}",
                AUTH_TOKEN_TAG, privyId, true, true);

        return new PrivyIdentity(privyId, email, walletAddress);
    }

    private Claims parseClaims(String tokenType, String token) {
        logTokenPreview(tokenType, token);

        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getVerificationKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            validateStandardClaims(claims);
            log.info("{} stage={}.claims.verified iss={} aud={} sub={}",
                    AUTH_TOKEN_TAG, tokenType, claims.getIssuer(), claims.getAudience(), claims.getSubject());
            return claims;
        } catch (ExpiredJwtException e) {
            log.warn("{} stage={}.claims.expired aud={} sub={} exception={}",
                    AUTH_TOKEN_TAG,
                    tokenType,
                    valueOrBlank(e.getClaims() != null ? e.getClaims().getAudience() : null),
                    valueOrBlank(e.getClaims() != null ? e.getClaims().getSubject() : null),
                    e.getClass().getSimpleName());
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("{} stage={}.claims.invalid exception={}",
                    AUTH_TOKEN_TAG, tokenType, e.getClass().getSimpleName());
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
    }

    private void validateStandardClaims(Claims claims) {
        if (!privyProperties.getIssuer().equals(claims.getIssuer())) {
            log.warn("{} stage=claims.issuer-mismatch expected={} actual={} sub={}",
                    AUTH_TOKEN_TAG, privyProperties.getIssuer(), claims.getIssuer(), claims.getSubject());
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }

        if (!privyProperties.getAppId().equals(claims.getAudience())) {
            log.warn("{} stage=claims.audience-mismatch expected={} actual={} sub={}",
                    AUTH_TOKEN_TAG, privyProperties.getAppId(), claims.getAudience(), claims.getSubject());
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
    }

    private String extractBearerToken(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            log.warn("{} stage=access.header.invalid headerPresent={} bearerPrefixMatched={}",
                    AUTH_TOKEN_TAG,
                    StringUtils.hasText(authorizationHeader),
                    authorizationHeader != null && authorizationHeader.startsWith(BEARER_PREFIX));
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return authorizationHeader.substring(BEARER_PREFIX.length()).trim();
    }

    private String readPrivyId(Claims claims) {
        String privyId = claims.getSubject();
        if (!StringUtils.hasText(privyId) || !privyId.startsWith("did:privy:")) {
            log.warn("{} stage=claims.subject.invalid subject={}", AUTH_TOKEN_TAG, privyId);
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return privyId;
    }

    private List<Map<String, Object>> parseLinkedAccounts(@Nullable Object linkedAccountsClaim) {
        if (linkedAccountsClaim == null) {
            log.warn("{} stage=identity.linked-accounts.missing", AUTH_TOKEN_TAG);
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
            log.warn("{} stage=identity.linked-accounts.invalid exception={}",
                    AUTH_TOKEN_TAG, e.getClass().getSimpleName());
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
            log.info("{} stage=verification-key.loaded algorithm=EC", AUTH_TOKEN_TAG);
            return KeyFactory.getInstance("EC").generatePublic(keySpec);
        } catch (Exception e) {
            log.error("{} stage=verification-key.invalid exception={}",
                    AUTH_TOKEN_TAG, e.getClass().getSimpleName(), e);
            throw new IllegalStateException("Failed to parse Privy verification key", e);
        }
    }

    private void logTokenPreview(String tokenType, String token) {
        try {
            String[] segments = token.split("\\.");
            if (segments.length < 2) {
                log.warn("{} stage={}.preview.invalid-token-format", AUTH_TOKEN_TAG, tokenType);
                return;
            }

            Map<String, Object> header = objectMapper.readValue(
                    Base64.getUrlDecoder().decode(segments[0]),
                    new TypeReference<>() {
                    }
            );
            Map<String, Object> payload = objectMapper.readValue(
                    Base64.getUrlDecoder().decode(segments[1]),
                    new TypeReference<>() {
                    }
            );

            log.info("{} stage={}.preview alg={} aud={} sub={}",
                    AUTH_TOKEN_TAG,
                    tokenType,
                    valueOrBlank(header.get("alg")),
                    valueOrBlank(payload.get("aud")),
                    valueOrBlank(payload.get("sub")));
        } catch (Exception e) {
            log.warn("{} stage={}.preview.decode-failed exception={}",
                    AUTH_TOKEN_TAG, tokenType, e.getClass().getSimpleName());
        }
    }

    private String valueOrBlank(@Nullable Object value) {
        if (value instanceof String string) {
            return string;
        }
        if (value instanceof List<?> list) {
            return list.toString();
        }
        return "";
    }
}
