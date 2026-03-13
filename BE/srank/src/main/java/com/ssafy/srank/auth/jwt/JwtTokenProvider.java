package com.ssafy.srank.auth.jwt;

import com.ssafy.srank.auth.domain.entity.AuthProvider;
import com.ssafy.srank.common.config.AppProperties;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_SESSION_ID = "sid";
    private static final String CLAIM_PROVIDER = "provider";
    private static final String CLAIM_OAUTH_ID = "oauthId";
    private static final String CLAIM_EMAIL = "email";

    private final AppProperties appProperties;
    private SecretKey secretKey;

    public JwtTokenProvider(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @PostConstruct
    void init() {
        this.secretKey = Keys.hmacShaKeyFor(appProperties.getAuth().getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(Long userId, String sessionId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, "access")
                .claim(CLAIM_SESSION_ID, sessionId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(appProperties.getAuth().getJwt().getAccessExpirationSeconds())))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public String createRefreshToken(Long userId, String sessionId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, "refresh")
                .claim(CLAIM_SESSION_ID, sessionId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(appProperties.getAuth().getJwt().getRefreshExpirationSeconds())))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public String createSignupToken(AuthProvider provider, String oauthId, String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email)
                .claim(CLAIM_TYPE, "signup")
                .claim(CLAIM_PROVIDER, provider.name())
                .claim(CLAIM_OAUTH_ID, oauthId)
                .claim(CLAIM_EMAIL, email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(appProperties.getAuth().getJwt().getSignupExpirationSeconds())))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public AccessTokenClaims parseAccessToken(String token) {
        Claims claims = parse(token, ErrorCode.TOKEN_INVALID, ErrorCode.TOKEN_EXPIRED);
        validateType(claims, "access", ErrorCode.TOKEN_INVALID);
        return new AccessTokenClaims(Long.parseLong(claims.getSubject()), claims.get(CLAIM_SESSION_ID, String.class));
    }

    public RefreshTokenClaims parseRefreshToken(String token) {
        Claims claims = parse(token, ErrorCode.REFRESH_TOKEN_INVALID, ErrorCode.REFRESH_TOKEN_EXPIRED);
        validateType(claims, "refresh", ErrorCode.REFRESH_TOKEN_INVALID);
        return new RefreshTokenClaims(Long.parseLong(claims.getSubject()), claims.get(CLAIM_SESSION_ID, String.class));
    }

    public SignupTokenClaims parseSignupToken(String token) {
        Claims claims = parse(token, ErrorCode.TOKEN_INVALID, ErrorCode.TOKEN_EXPIRED);
        validateType(claims, "signup", ErrorCode.TOKEN_INVALID);
        return new SignupTokenClaims(
                AuthProvider.from(claims.get(CLAIM_PROVIDER, String.class)),
                claims.get(CLAIM_OAUTH_ID, String.class),
                claims.get(CLAIM_EMAIL, String.class)
        );
    }

    private Claims parse(String token, ErrorCode invalidCode, ErrorCode expiredCode) {
        try {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            throw new BusinessException(expiredCode);
        } catch (Exception e) {
            throw new BusinessException(invalidCode);
        }
    }

    private void validateType(Claims claims, String expected, ErrorCode invalidCode) {
        if (!expected.equals(claims.get(CLAIM_TYPE, String.class))) {
            throw new BusinessException(invalidCode);
        }
    }

    public record AccessTokenClaims(Long userId, String sessionId) {
    }

    public record RefreshTokenClaims(Long userId, String sessionId) {
    }

    public record SignupTokenClaims(AuthProvider provider, String oauthId, String email) {
    }
}
