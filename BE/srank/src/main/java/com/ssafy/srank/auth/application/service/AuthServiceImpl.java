package com.ssafy.srank.auth.application.service;

import com.ssafy.srank.auth.application.dto.request.LoginRequest;
import com.ssafy.srank.auth.application.dto.request.SignupRequest;
import com.ssafy.srank.auth.application.dto.response.AuthResult;
import com.ssafy.srank.auth.application.dto.response.LoginResponse;
import com.ssafy.srank.auth.application.dto.response.RefreshResponse;
import com.ssafy.srank.auth.application.dto.response.SignupResponse;
import com.ssafy.srank.auth.domain.entity.AuthProvider;
import com.ssafy.srank.auth.domain.entity.AuthSession;
import com.ssafy.srank.auth.jwt.JwtTokenProvider;
import com.ssafy.srank.auth.repository.AuthSessionRepository;
import com.ssafy.srank.common.config.AppProperties;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.security.AuthenticatedUser;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.domain.entity.UserCoinLedger;
import com.ssafy.srank.user.domain.entity.UserGoldLedger;
import com.ssafy.srank.user.domain.policy.NicknamePolicy;
import com.ssafy.srank.user.repository.UserCoinLedgerRepository;
import com.ssafy.srank.user.repository.UserGoldLedgerRepository;
import com.ssafy.srank.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final AuthSessionRepository authSessionRepository;
    private final UserGoldLedgerRepository userGoldLedgerRepository;
    private final UserCoinLedgerRepository userCoinLedgerRepository;
    private final GoogleOAuthService googleOAuthService;
    private final WalletProvider walletProvider;
    private final JwtTokenProvider jwtTokenProvider;
    private final AppProperties appProperties;

    @Override
    @Transactional
    public AuthResult<LoginResponse> login(LoginRequest request, String userAgent, String ipAddress) {
        AuthProvider provider = AuthProvider.from(request.provider());
        GoogleUserInfo googleUserInfo = googleOAuthService.getUserInfo(request.oauthAccessToken());

        User user = userRepository.findByProviderAndOauthId(provider, googleUserInfo.subject()).orElse(null);
        if (user == null) {
            String signupToken = jwtTokenProvider.createSignupToken(provider, googleUserInfo.subject(), googleUserInfo.email());
            return new AuthResult<>(LoginResponse.newUser(signupToken), null);
        }

        if (user.isWithdrawn()) {
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }

        revokeAllSessions(user.getId());
        IssuedTokens tokens = issueTokens(user.getId(), userAgent, ipAddress);
        return new AuthResult<>(LoginResponse.existingUser(tokens.accessToken()), tokens.refreshToken());
    }

    @Override
    @Transactional
    public AuthResult<SignupResponse> signup(SignupRequest request, String userAgent, String ipAddress) {
        validateNickname(request.nickname());
        JwtTokenProvider.SignupTokenClaims claims = jwtTokenProvider.parseSignupToken(request.signupToken());

        userRepository.findByProviderAndOauthId(claims.provider(), claims.oauthId()).ifPresent(existing -> {
            if (existing.isWithdrawn()) {
                throw new BusinessException(ErrorCode.WITHDRAWN_USER);
            }
            throw new BusinessException(ErrorCode.DUPLICATE_REQUEST, "이미 가입된 사용자입니다.");
        });

        userRepository.findByEmail(claims.email()).ifPresent(existing -> {
            if (existing.isWithdrawn()) {
                throw new BusinessException(ErrorCode.WITHDRAWN_USER);
            }
            throw new BusinessException(ErrorCode.DUPLICATE_REQUEST, "이미 가입된 사용자입니다.");
        });

        if (userRepository.existsByNicknameAndDeletedAtIsNull(request.nickname())) {
            throw new BusinessException(ErrorCode.NICKNAME_DUPLICATE);
        }

        User user = userRepository.save(User.create(claims.email(), claims.provider(), claims.oauthId(), request.nickname()));
        try {
            String walletAddress = walletProvider.createWallet(user);
            if (walletAddress != null && !walletAddress.isBlank()) {
                user.assignWalletAddress(walletAddress);
            }
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.WALLET_NOT_FOUND, "지갑 생성에 실패했습니다.");
        }

        allocateInitialResources(user.getId());
        IssuedTokens tokens = issueTokens(user.getId(), userAgent, ipAddress);
        return new AuthResult<>(new SignupResponse(tokens.accessToken(), user.getId(), user.getNickname()), tokens.refreshToken());
    }

    @Override
    @Transactional
    public AuthResult<RefreshResponse> refresh(String refreshTokenCookie) {
        if (refreshTokenCookie == null || refreshTokenCookie.isBlank()) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID, "리프레시 토큰이 필요합니다.");
        }

        JwtTokenProvider.RefreshTokenClaims claims = jwtTokenProvider.parseRefreshToken(refreshTokenCookie);
        AuthSession session = authSessionRepository.findById(claims.sessionId())
                .orElseThrow(() -> new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID));

        if (session.isRevoked()) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
        }
        if (session.isExpired()) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }
        if (!session.getUserId().equals(claims.userId())) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
        }
        if (!hash(refreshTokenCookie).equals(session.getRefreshTokenHash())) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        User user = userRepository.findById(claims.userId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (user.isWithdrawn()) {
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }

        String newRefreshToken = jwtTokenProvider.createRefreshToken(user.getId(), session.getId());
        session.rotate(hash(newRefreshToken), LocalDateTime.now().plusSeconds(appProperties.getAuth().getJwt().getRefreshExpirationSeconds()));
        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), session.getId());
        return new AuthResult<>(new RefreshResponse(accessToken), newRefreshToken);
    }

    @Override
    @Transactional
    public void logout(AuthenticatedUser authenticatedUser) {
        AuthSession session = authSessionRepository.findById(authenticatedUser.sessionId())
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        session.revoke();
    }

    private void validateNickname(String nickname) {
        if (!NicknamePolicy.isValid(nickname)) {
            throw new BusinessException(ErrorCode.NICKNAME_INVALID);
        }
    }

    private void allocateInitialResources(Long userId) {
        long initialGold = appProperties.getGame().getInitialGold();
        long initialCoin = appProperties.getGame().getInitialCoin();
        userGoldLedgerRepository.save(UserGoldLedger.create(userId, initialGold, initialGold, "SIGNUP_REWARD"));
        userCoinLedgerRepository.save(UserCoinLedger.create(userId, initialCoin, initialCoin, "SIGNUP_REWARD"));
    }

    private IssuedTokens issueTokens(Long userId, String userAgent, String ipAddress) {
        String sessionId = UUID.randomUUID().toString();
        String refreshToken = jwtTokenProvider.createRefreshToken(userId, sessionId);
        AuthSession session = AuthSession.create(
                sessionId,
                userId,
                hash(refreshToken),
                LocalDateTime.now().plusSeconds(appProperties.getAuth().getJwt().getRefreshExpirationSeconds()),
                userAgent,
                ipAddress
        );
        authSessionRepository.save(session);
        String accessToken = jwtTokenProvider.createAccessToken(userId, session.getId());
        return new IssuedTokens(accessToken, refreshToken);
    }

    private void revokeAllSessions(Long userId) {
        authSessionRepository.findAllByUserIdAndRevokedAtIsNull(userId)
                .forEach(AuthSession::revoke);
    }

    private String hash(String value) {
        return DigestUtils.md5DigestAsHex(value.getBytes(StandardCharsets.UTF_8));
    }

    private record IssuedTokens(String accessToken, String refreshToken) {
    }
}
