package com.ssafy.srank.user.application.service;

import com.ssafy.srank.user.application.dto.request.UpdateNicknameRequest;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;

public interface UserService {

    MyInfoResponse getMyInfo(Long userId);

    void updateNickname(Long userId, UpdateNicknameRequest request);

    void withdraw(Long userId);

    long rewardGold(Long userId, Long gold);

    long spendGold(Long userId, Long gold);
}
