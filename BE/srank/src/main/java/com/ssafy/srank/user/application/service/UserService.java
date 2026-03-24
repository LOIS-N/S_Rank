package com.ssafy.srank.user.application.service;

import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.user.application.dto.request.UpdateNicknameRequest;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;
import com.ssafy.srank.user.application.dto.response.MyGachaInfo;

public interface UserService {

    MyInfoResponse getMyInfo(Long userId);

    MyGachaInfo getMyGachaInfo(Long userId);

    void updateNickname(Long userId, UpdateNicknameRequest request);

    void withdraw(Long userId);

    long rewardGold(Long userId, Long gold, GoldLogReason reason);

    long spendGold(Long userId, Long gold, GoldLogReason reason);
}
