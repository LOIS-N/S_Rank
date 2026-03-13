package com.ssafy.srank.user.application.service;

import com.ssafy.srank.auth.repository.AuthSessionRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;
import com.ssafy.srank.user.application.dto.response.UpdateNicknameResponse;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.domain.policy.NicknamePolicy;
import com.ssafy.srank.user.repository.UserCoinLedgerRepository;
import com.ssafy.srank.user.repository.UserGoldLedgerRepository;
import com.ssafy.srank.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserGoldLedgerRepository userGoldLedgerRepository;
    private final UserCoinLedgerRepository userCoinLedgerRepository;
    private final AuthSessionRepository authSessionRepository;

    @Override
    @Transactional
    public MyInfoResponse getMyInfo(Long userId) {
        User user = getActiveUser(userId);
        long gold = userGoldLedgerRepository.findTopByUserIdOrderByIdDesc(userId)
                .map(it -> it.getBalanceAfter())
                .orElse(0L);
        long coin = userCoinLedgerRepository.findTopByUserIdOrderByIdDesc(userId)
                .map(it -> it.getBalanceAfter())
                .orElse(0L);
        return new MyInfoResponse(user.getId(), user.getEmail(), user.getNickname(), gold, coin, user.getWalletAddress());
    }

    @Override
    @Transactional
    public UpdateNicknameResponse updateNickname(Long userId, String nickname) {
        if (!NicknamePolicy.isValid(nickname)) {
            throw new BusinessException(ErrorCode.NICKNAME_INVALID);
        }

        User user = getActiveUser(userId);
        if (!nickname.equals(user.getNickname()) && userRepository.existsByNicknameAndDeletedAtIsNull(nickname)) {
            throw new BusinessException(ErrorCode.NICKNAME_DUPLICATE);
        }

        user.changeNickname(nickname);
        return new UpdateNicknameResponse(user.getNickname());
    }

    @Override
    @Transactional
    public void withdraw(Long userId, String reason) {
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (user.isWithdrawn()) {
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }
        user.withdraw();
        authSessionRepository.findAllByUserIdAndRevokedAtIsNull(userId)
                .forEach(AuthSession -> AuthSession.revoke());
    }

    private User getActiveUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (user.isWithdrawn()) {
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }
        return user;
    }
}
