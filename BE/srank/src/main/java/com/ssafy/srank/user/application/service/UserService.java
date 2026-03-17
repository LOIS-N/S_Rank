package com.ssafy.srank.user.application.service;

import com.ssafy.srank.user.application.dto.request.UpdateNicknameRequest;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;

public interface UserService {

    MyInfoResponse getMyInfo(String authorizationHeader);

    void updateNickname(String authorizationHeader, UpdateNicknameRequest request);

    void withdraw(String authorizationHeader);
}
