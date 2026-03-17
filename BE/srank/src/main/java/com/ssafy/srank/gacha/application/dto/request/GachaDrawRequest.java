package com.ssafy.srank.gacha.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GachaDrawRequest {

    @NotBlank
    private String type;

    @NotNull
    private Integer count;
}
