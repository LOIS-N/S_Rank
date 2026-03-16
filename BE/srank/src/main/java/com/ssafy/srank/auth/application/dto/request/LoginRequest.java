package com.ssafy.srank.auth.application.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "provider는 필수입니다.")
        String provider,
        @NotBlank(message = "oauthAccessToken은 필수입니다.")
        String oauthAccessToken
) {
}
