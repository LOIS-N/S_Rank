package com.ssafy.srank.gacha.application.dto.response;

import com.ssafy.srank.gacha.domain.enums.ProofAlgorithmVersion;

import java.util.List;

public record GachaProofResponse(
        String requestId,
        ProofAlgorithmVersion algorithmVersion,
        String serverSeedHash,
        String revealedServerSeed,
        String clientSeed,
        String requestNonce,
        String resultDigest,
        List<GachaDrawProofItemResponse> drawProofs
) {
}
