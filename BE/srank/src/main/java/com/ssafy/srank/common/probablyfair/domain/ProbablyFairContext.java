package com.ssafy.srank.common.probablyfair.domain;

public record ProbablyFairContext(
        String serverSeed,
        ProofAlgorithmVersion algorithmVersion
) {
}
