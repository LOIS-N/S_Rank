package com.ssafy.srank.user.application.service;

import com.ssafy.srank.user.application.dto.response.MyInfoResponse;
import com.ssafy.srank.user.application.dto.response.UpdateNicknameResponse;

public interface UserService {

    MyInfoResponse getMyInfo(Long userId);

    UpdateNicknameResponse updateNickname(Long userId, String nickname);

    void withdraw(Long userId, String reason);
}
