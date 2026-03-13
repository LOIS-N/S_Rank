package com.ssafy.srank.auth.application.dto.response;

public record SignupResponse(
        String accessToken,
        Long userId,
        String nickname
) {
}
