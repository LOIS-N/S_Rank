package com.ssafy.srank.user.application.dto.response;

import com.ssafy.srank.user.domain.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MyGachaInfo {
    private Long userId;
    private long gold;
    private int level;

    public static MyGachaInfo from(User user){
        return new MyGachaInfo(user.getUserId(), user.getGold(), user.getLevel());
    }
}
