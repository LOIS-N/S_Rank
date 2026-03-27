package com.ssafy.srank.synthesis.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SynthesisAttemptRequest {

    @NotEmpty
    @Size(min = 2, max = 5)
    private List<Long> cardIds;

    @NotBlank
    private String clientSeed;
}
