package com.ssafy.srank.gacha.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GachaDrawRequest {

    // 현재는 FLYER만 실제로 열려 있지만, 추후 EXPO/OPEN_RECRUIT 확장을 위해 문자열로 받는다.
    @NotBlank
    private String type;

    // 1회 또는 10회만 허용하고, 실제 검증은 서비스에서 비즈니스 에러 코드로 다시 고정한다.
    @NotNull
    private Integer count;
}
