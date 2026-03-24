package com.ssafy.srank.gacha.application.dto.response;

import com.ssafy.srank.common.probablyfair.domain.ProofAlgorithmVersion;

public record GachaProofResponse(
        ProofAlgorithmVersion algorithmVersion,
        String serverSeed,
        String clientSeed
) {
}
