package com.ssafy.srank.user.application.dto.response;

public record MyInfoResponse(
        Long userId,
        String email,
        String nickname,
        long gold,
        long coin,
        String walletAddress
) {
}
