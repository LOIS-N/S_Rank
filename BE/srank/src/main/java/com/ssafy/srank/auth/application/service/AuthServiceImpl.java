package com.ssafy.srank.auth.application.service;

import com.ssafy.srank.auth.application.dto.request.LoginRequest;
import com.ssafy.srank.auth.application.dto.response.LoginResponse;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.desk.application.service.DeskService;
import com.ssafy.srank.log.application.command.AuthLogCommand;
import com.ssafy.srank.log.application.command.GoldLogCommand;
import com.ssafy.srank.log.application.facade.AuthLogFacade;
import com.ssafy.srank.log.application.facade.EconomyLogFacade;
import com.ssafy.srank.log.domain.enums.AuthLogEventType;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private static final String AUTH_LOGIN_TAG = "[AUTH][LOGIN]";

    private final PrivyTokenService privyTokenService;
    private final UserRepository userRepository;
    private final DeskService deskService;
    private final AuthLogFacade authLogFacade;
    private final EconomyLogFacade economyLogFacade;

    private static final long SIGNUP_BONUS_GOLD = 300_000L;

    @Override
    @Transactional
    public LoginResponse login(String authorizationHeader, LoginRequest request) {
        log.info("{} stage=service.start", AUTH_LOGIN_TAG);

        String accessPrivyId = privyTokenService.verifyAccessToken(authorizationHeader);
        log.info("{} stage=service.access-token.verified accessSub={}", AUTH_LOGIN_TAG, accessPrivyId);

        PrivyIdentity identity = privyTokenService.verifyIdentityToken(request.getIdentityToken());
        log.info("{} stage=service.identity-token.verified identitySub={} emailPresent={} walletPresent={}",
                AUTH_LOGIN_TAG,
                identity.privyId(),
                hasText(identity.email()),
                hasText(identity.walletAddress()));

        if (!accessPrivyId.equals(identity.privyId())) {
            log.warn("{} stage=service.subject-mismatch accessSub={} identitySub={}",
                    AUTH_LOGIN_TAG, accessPrivyId, identity.privyId());
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }

        Optional<User> existingUser = userRepository.findByPrivyId(accessPrivyId);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            log.info("{} stage=service.user-found userId={} privyId={}",
                    AUTH_LOGIN_TAG, user.getUserId(), user.getPrivyId());
            ensureActive(user);
            authLogFacade.recordLogin(new AuthLogCommand(
                    user.getUserId(),
                    AuthLogEventType.LOGIN,
                    LocalDateTime.now()
            ));
            return new LoginResponse(false);
        }

        log.info("{} stage=service.user-not-found privyId={} action=create", AUTH_LOGIN_TAG, accessPrivyId);
        ensureNoConflicts(identity);

        try {
            log.info("{} stage=service.user-save.attempt privyId={}", AUTH_LOGIN_TAG, identity.privyId());
            User savedUser = userRepository.save(User.builder()
                    .privyId(identity.privyId())
                    .email(identity.email())
                    .walletAddress(identity.walletAddress())
                    .gold(SIGNUP_BONUS_GOLD)
                    .build());

            deskService.unlockDesk(savedUser.getUserId(), 1L);
            LocalDateTime now = LocalDateTime.now();
            authLogFacade.recordSignup(new AuthLogCommand(
                    savedUser.getUserId(),
                    AuthLogEventType.SIGNUP,
                    now
            ));
            economyLogFacade.recordGoldChange(new GoldLogCommand(
                    savedUser.getUserId(),
                    SIGNUP_BONUS_GOLD,
                    savedUser.getGold(),
                    GoldLogReason.SIGNUP_BONUS,
                    now
            ));

            log.info("{} stage=service.user-save.success privyId={}", AUTH_LOGIN_TAG, identity.privyId());
            return new LoginResponse(true);
        } catch (DataIntegrityViolationException e) {
            log.warn("{} stage=service.user-save.data-integrity privyId={} exception={}",
                    AUTH_LOGIN_TAG, identity.privyId(), e.getClass().getSimpleName());
            return userRepository.findByPrivyId(accessPrivyId)
                    .map(user -> {
                        log.info("{} stage=service.user-save.recovered-existing userId={} privyId={}",
                                AUTH_LOGIN_TAG, user.getUserId(), user.getPrivyId());
                        ensureActive(user);
                        return new LoginResponse(false);
                    })
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_ALREADY_EXISTS));
        } catch (RuntimeException e) {
            log.error("{} stage=service.user-save.unexpected privyId={} exception={}",
                    AUTH_LOGIN_TAG, identity.privyId(), e.getClass().getSimpleName(), e);
            throw e;
        }
    }

    private void ensureNoConflicts(PrivyIdentity identity) {
        userRepository.findByEmail(identity.email()).ifPresent(user -> {
            log.warn("{} stage=service.conflict.email ownerUserId={} privyId={}",
                    AUTH_LOGIN_TAG, user.getUserId(), user.getPrivyId());
            handleExistingIdentityOwner(user);
        });
        userRepository.findByWalletAddress(identity.walletAddress()).ifPresent(user -> {
            log.warn("{} stage=service.conflict.wallet ownerUserId={} privyId={}",
                    AUTH_LOGIN_TAG, user.getUserId(), user.getPrivyId());
            handleExistingIdentityOwner(user);
        });
    }

    private void handleExistingIdentityOwner(User user) {
        if (user.isWithdrawn()) {
            log.warn("{} stage=service.conflict.withdrawn userId={} privyId={}",
                    AUTH_LOGIN_TAG, user.getUserId(), user.getPrivyId());
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }

        log.warn("{} stage=service.conflict.active userId={} privyId={}",
                AUTH_LOGIN_TAG, user.getUserId(), user.getPrivyId());
        throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS);
    }

    private void ensureActive(User user) {
        if (user.isWithdrawn()) {
            log.warn("{} stage=service.user.withdrawn userId={} privyId={}",
                    AUTH_LOGIN_TAG, user.getUserId(), user.getPrivyId());
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
