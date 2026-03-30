package com.ssafy.srank.auth.application.service;

import com.ssafy.srank.auth.application.dto.request.LoginRequest;
import com.ssafy.srank.auth.application.dto.response.LoginResponse;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.metrics.AuthMetrics;
import com.ssafy.srank.common.metrics.BusinessExceptionMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.desk.application.service.DeskService;
import com.ssafy.srank.log.application.command.AuthLogCommand;
import com.ssafy.srank.log.application.facade.AuthLogFacade;
import com.ssafy.srank.log.domain.enums.AuthLogEventType;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.rabbitmq.log.message.GoldLogMessage;
import com.ssafy.srank.rabbitmq.log.message.UserAuthMessage;
import com.ssafy.srank.rabbitmq.log.producer.GoldLogProducer;
import com.ssafy.srank.rabbitmq.log.producer.UserAuthLogProducer;
import com.ssafy.srank.ranking.application.event.UserCardsChangedEvent;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final long SIGNUP_BONUS_GOLD = 500_000L;

    private final PrivyTokenService privyTokenService;
    private final UserRepository userRepository;
    private final DeskService deskService;
    private final AuthLogFacade authLogFacade;
    private final AuthMetrics authMetrics;
    private final BusinessExceptionMetrics businessExceptionMetrics;
    private final ApplicationEventPublisher eventPublisher;
    private final UserAuthLogProducer producer;
    private final GoldLogProducer goldProducer;

    @Override
    @Transactional
    public LoginResponse login(String authorizationHeader, LoginRequest request) {
        long startNanos = System.nanoTime();
        String loginType = "existing";
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            String accessPrivyId = privyTokenService.verifyAccessToken(authorizationHeader);
            PrivyIdentity identity = privyTokenService.verifyIdentityToken(request.getIdentityToken());

            if (!accessPrivyId.equals(identity.privyId())) {
                throw new BusinessException(ErrorCode.TOKEN_INVALID);
            }

            Optional<User> existingUser = userRepository.findByPrivyId(accessPrivyId);
            if (existingUser.isPresent()) {
                User user = existingUser.get();
                ensureActive(user);

                producer.sendUserMessage(new UserAuthMessage(
                        user.getUserId(),
                        AuthLogEventType.LOGIN,
                        LocalDateTime.now()
                ));
                return new LoginResponse(false);
            }

            loginType = "signup";
            ensureNoConflicts(identity);

            try {
                User savedUser = userRepository.save(User.builder()
                        .privyId(identity.privyId())
                        .email(identity.email())
                        .walletAddress(identity.walletAddress())
                        .gold(SIGNUP_BONUS_GOLD)
                        .level(0)
                        .build());

                deskService.unlockDesk(savedUser.getUserId(), 1L);
                LocalDateTime now = LocalDateTime.now();
                authLogFacade.recordSignup(new AuthLogCommand(
                        savedUser.getUserId(),
                        AuthLogEventType.SIGNUP,
                        now
                ));

                goldProducer.sendGoldLogMessage(new GoldLogMessage(
                        savedUser.getUserId(),
                        SIGNUP_BONUS_GOLD,
                        savedUser.getGold(),
                        GoldLogReason.SIGNUP_BONUS,
                        now
                ));

                eventPublisher.publishEvent(new UserCardsChangedEvent(savedUser.getUserId()));
                return new LoginResponse(true);
            } catch (DataIntegrityViolationException e) {
                loginType = "race_recovery";
                return userRepository.findByPrivyId(accessPrivyId)
                        .map(user -> {
                            ensureActive(user);
                            return new LoginResponse(false);
                        })
                        .orElseThrow(() -> new BusinessException(ErrorCode.USER_ALREADY_EXISTS));
            }
        } catch (BusinessException e) {
            result = MetricTagValues.RESULT_FAILURE;
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record("auth.login", e);
            throw e;
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            authMetrics.recordLogin(System.nanoTime() - startNanos, loginType, result, errorCode);
        }
    }

    private void ensureNoConflicts(PrivyIdentity identity) {
        userRepository.findByEmail(identity.email()).ifPresent(this::handleExistingIdentityOwner);
        userRepository.findByWalletAddress(identity.walletAddress()).ifPresent(this::handleExistingIdentityOwner);
    }

    private void handleExistingIdentityOwner(User user) {
        if (user.isWithdrawn()) {
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }
        throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS);
    }

    private void ensureActive(User user) {
        if (user.isWithdrawn()) {
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }
    }
}
