package com.ssafy.srank.gacha.domain.policy;

import com.ssafy.srank.gacha.domain.enums.ProofAlgorithmVersion;

public record ProvablyFairContext(
        String requestId,
        String serverSeed,
        String serverSeedHash,
        String requestNonce,
        ProofAlgorithmVersion algorithmVersion
) {
}
