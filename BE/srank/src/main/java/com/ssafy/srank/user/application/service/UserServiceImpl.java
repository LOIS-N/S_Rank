package com.ssafy.srank.user.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.log.application.command.AuthLogCommand;
import com.ssafy.srank.log.application.facade.AuthLogFacade;
import com.ssafy.srank.log.domain.enums.AuthLogEventType;
import com.ssafy.srank.user.application.dto.request.UpdateNicknameRequest;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private static final Pattern NICKNAME_PATTERN = Pattern.compile("^[A-Za-z0-9가-힣]{2,8}$");

    private final UserRepository userRepository;
    private final AuthLogFacade authLogFacade;

    @Override
    public MyInfoResponse getMyInfo(Long userId) {
        return MyInfoResponse.from(getActiveUser(userId));
    }

    @Override
    @Transactional
    public void updateNickname(Long userId, UpdateNicknameRequest request) {
        User user = getActiveUser(userId);
        validateNickname(request.getNickname());

        if (request.getNickname().equals(user.getNickname())) {
            return;
        }

        if (userRepository.existsByNicknameAndDeletedAtIsNull(request.getNickname())) {
            throw new BusinessException(ErrorCode.NICKNAME_DUPLICATE);
        }

        user.updateNickname(request.getNickname());
    }

    @Override
    @Transactional
    public void withdraw(Long userId) {
        User user = getActiveUser(userId);
        user.withdraw();
        authLogFacade.recordWithdraw(new AuthLogCommand(
                userId,
                AuthLogEventType.WITHDRAW,
                LocalDateTime.now()
        ));
    }

    @Override
    public long rewardGold(Long userId, Long gold) {
        User user = getActiveUser(userId);
        user.increaseGold(gold);
        return user.getGold();
    }

    @Override
    public long spendGold(Long userId, Long gold) {
        User user = getActiveUser(userId);
        user.decreaseGold(gold);
        return user.getGold();
    }

    private User getActiveUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isWithdrawn()) {
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }
        return user;
    }

    private void validateNickname(String nickname) {
        if (!NICKNAME_PATTERN.matcher(nickname).matches()) {
            throw new BusinessException(ErrorCode.NICKNAME_INVALID);
        }
    }
}
