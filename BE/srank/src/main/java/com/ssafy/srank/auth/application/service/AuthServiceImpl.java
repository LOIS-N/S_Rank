package com.ssafy.srank.auth.application.service;

import com.ssafy.srank.auth.application.dto.request.LoginRequest;
import com.ssafy.srank.auth.application.dto.response.LoginResponse;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final PrivyTokenService privyTokenService;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public LoginResponse login(String authorizationHeader, LoginRequest request) {
        String accessPrivyId = privyTokenService.verifyAccessToken(authorizationHeader);
        PrivyIdentity identity = privyTokenService.verifyIdentityToken(request.getIdentityToken());

        if (!accessPrivyId.equals(identity.privyId())) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }

        Optional<User> existingUser = userRepository.findByPrivyId(accessPrivyId);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            ensureActive(user);
            return new LoginResponse(false);
        }

        ensureNoConflicts(identity);

        try {
            userRepository.save(User.builder()
                    .privyId(identity.privyId())
                    .email(identity.email())
                    .walletAddress(identity.walletAddress())
                    .build());
            return new LoginResponse(true);
        } catch (DataIntegrityViolationException e) {
            return userRepository.findByPrivyId(accessPrivyId)
                    .map(user -> {
                        ensureActive(user);
                        return new LoginResponse(false);
                    })
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_ALREADY_EXISTS));
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
