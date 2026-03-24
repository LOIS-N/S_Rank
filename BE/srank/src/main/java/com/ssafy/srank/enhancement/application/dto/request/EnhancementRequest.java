package com.ssafy.srank.enhancement.application.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EnhancementRequest {
    @NotNull
    private Long cardId;

    @NotNull
    private String clientSeed;
}
