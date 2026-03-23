package com.ssafy.srank.gacha.domain.policy;

import com.ssafy.srank.gacha.domain.enums.ProofAlgorithmVersion;

public record ProvablyFairContext(
        String serverSeed,
        ProofAlgorithmVersion algorithmVersion
) {
}
