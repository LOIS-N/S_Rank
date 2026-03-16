package com.ssafy.srank.auth.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import com.ssafy.srank.user.domain.policy.NicknamePolicy;

public record SignupRequest(
        @NotBlank(message = "signupToken은 필수입니다.")
        String signupToken,
        @NotBlank(message = "nickname은 필수입니다.")
        @Pattern(regexp = NicknamePolicy.REGEX, message = NicknamePolicy.VALIDATION_MESSAGE)
        String nickname
) {
}
