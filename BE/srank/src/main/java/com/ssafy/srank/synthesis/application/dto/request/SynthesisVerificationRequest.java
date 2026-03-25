package com.ssafy.srank.synthesis.application.dto.request;

import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.common.probablyfair.domain.ProofAlgorithmVersion;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SynthesisVerificationRequest {

    @NotNull
    private CardGrade sourceGrade;

    @NotNull
    @Min(2)
    @Max(5)
    private Integer cardCount;

    @NotBlank
    private String clientSeed;

    @NotBlank
    private String serverSeed;

    @NotNull
    private ProofAlgorithmVersion algorithmVersion;
}
