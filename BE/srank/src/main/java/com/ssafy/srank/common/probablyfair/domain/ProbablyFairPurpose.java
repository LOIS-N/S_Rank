package com.ssafy.srank.common.probablyfair.domain;

public interface ProbablyFairPurpose {

    String proofKey();

    static ProbablyFairPurpose of(String proofKey) {
        return () -> proofKey;
    }
}
