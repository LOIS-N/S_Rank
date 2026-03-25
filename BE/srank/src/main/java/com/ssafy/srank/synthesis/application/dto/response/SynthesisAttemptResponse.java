package com.ssafy.srank.synthesis.application.dto.response;

import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SynthesisAttemptResponse {

    private boolean success;
    private String sourceGrade;
    private String resultGrade;
    private UserCardResponse resultCard;
    private long remainingGold;
    private SynthesisProofResponse proof;

    public static SynthesisAttemptResponse of(
            boolean success,
            String sourceGrade,
            String resultGrade,
            UserCardResponse resultCard,
            long remainingGold,
            SynthesisProofResponse proof
    ) {
        return SynthesisAttemptResponse.builder()
                .success(success)
                .sourceGrade(sourceGrade)
                .resultGrade(resultGrade)
                .resultCard(resultCard)
                .remainingGold(remainingGold)
                .proof(proof)
                .build();
    }
}
