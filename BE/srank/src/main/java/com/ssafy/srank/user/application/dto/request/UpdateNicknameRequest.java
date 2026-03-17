package com.ssafy.srank.user.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateNicknameRequest {

    @NotBlank(message = "nickname은 필수입니다.")
    private String nickname;
}
