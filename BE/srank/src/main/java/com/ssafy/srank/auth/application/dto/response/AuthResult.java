package com.ssafy.srank.auth.application.dto.response;

public record AuthResult<T>(
        T body,
        String refreshToken
) {
}
