package com.ssafy.srank.user.application.service;

import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.user.application.dto.request.UpdateNicknameRequest;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;
import com.ssafy.srank.user.application.dto.response.MyGachaInfo;

import java.util.List;

public interface UserService {

    MyInfoResponse getMyInfo(Long userId);

    MyGachaInfo getMyGachaInfo(Long userId);

    String getWalletAddress(Long userId);

    void updateNickname(Long userId, UpdateNicknameRequest request);

    void withdraw(Long userId);

    long rewardGold(Long userId, Long gold, GoldLogReason reason);

    long spendGold(Long userId, Long gold, GoldLogReason reason);

    void levelUp(Long userId);

    void rewardCoin(Long userId, Long coin);

    //귀찮아서 전부 들고옴
    List<Long> getUserIds();
}
