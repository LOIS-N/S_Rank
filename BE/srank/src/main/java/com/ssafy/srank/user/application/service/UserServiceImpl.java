package com.ssafy.srank.user.application.service;

import com.ssafy.srank.auth.application.service.PrivyTokenService;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.user.application.dto.request.UpdateNicknameRequest;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private static final Pattern NICKNAME_PATTERN = Pattern.compile("^[A-Za-z0-9가-힣]{2,8}$");

    private final PrivyTokenService privyTokenService;
    private final UserRepository userRepository;

    @Override
    public MyInfoResponse getMyInfo(String authorizationHeader) {
        return MyInfoResponse.from(getActiveUser(authorizationHeader));
    }

    @Override
    @Transactional
    public void updateNickname(String authorizationHeader, UpdateNicknameRequest request) {
        User user = getActiveUser(authorizationHeader);
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
    public void withdraw(String authorizationHeader) {
        User user = getActiveUser(authorizationHeader);
        user.withdraw();
    }

    private User getActiveUser(String authorizationHeader) {
        String privyId = privyTokenService.verifyAccessToken(authorizationHeader);
        User user = userRepository.findByPrivyId(privyId)
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
