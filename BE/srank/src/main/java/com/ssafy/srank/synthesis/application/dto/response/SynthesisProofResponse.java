package com.ssafy.srank.synthesis.application.dto.response;

import com.ssafy.srank.common.probablyfair.domain.ProofAlgorithmVersion;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SynthesisProofResponse {

    private ProofAlgorithmVersion algorithmVersion;
    private String serverSeed;
    private String clientSeed;

    public static SynthesisProofResponse of(
            ProofAlgorithmVersion algorithmVersion,
            String serverSeed,
            String clientSeed
    ) {
        return SynthesisProofResponse.builder()
                .algorithmVersion(algorithmVersion)
                .serverSeed(serverSeed)
                .clientSeed(clientSeed)
                .build();
    }
}
