package com.ssafy.srank.user.application.dto.response;

import com.ssafy.srank.user.domain.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MyInfoResponse {

    private String nickname;
    private int level;
    private long gold;
    private long coin;

    public static MyInfoResponse from(User user) {
        return new MyInfoResponse(
                user.getNickname(),
                user.getLevel(),
                user.getGold(),
                user.getCoin()
        );
    }
}
