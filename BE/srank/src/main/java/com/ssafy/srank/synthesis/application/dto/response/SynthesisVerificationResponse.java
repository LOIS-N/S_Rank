package com.ssafy.srank.synthesis.application.dto.response;

import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SynthesisVerificationResponse {

    private boolean success;
    private String sourceGrade;
    private String resultGrade;
    private UserCardResponse resultCard;
    private SynthesisProofResponse proof;

    public static SynthesisVerificationResponse of(
            boolean success,
            String sourceGrade,
            String resultGrade,
            UserCardResponse resultCard,
            SynthesisProofResponse proof
    ) {
        return SynthesisVerificationResponse.builder()
                .success(success)
                .sourceGrade(sourceGrade)
                .resultGrade(resultGrade)
                .resultCard(resultCard)
                .proof(proof)
                .build();
    }
}
