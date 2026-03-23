package com.ssafy.srank.gacha.application.dto.response;

import com.ssafy.srank.gacha.domain.enums.ProofAlgorithmVersion;

public record GachaProofResponse(
        ProofAlgorithmVersion algorithmVersion,
        String serverSeed,
        String clientSeed
) {
}
