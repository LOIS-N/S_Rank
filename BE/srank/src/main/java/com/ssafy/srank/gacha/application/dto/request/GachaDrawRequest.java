package com.ssafy.srank.gacha.application.dto.request;

import com.ssafy.srank.gacha.domain.enums.GachaType;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GachaDrawRequest {

    @NotNull
    private GachaType type;

    @NotNull
    private Integer count;
}
