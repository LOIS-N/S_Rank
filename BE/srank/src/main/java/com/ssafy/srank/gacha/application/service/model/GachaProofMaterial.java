package com.ssafy.srank.gacha.application.service.model;

import com.ssafy.srank.gacha.application.dto.response.GachaDrawProofItemResponse;

import java.util.List;

public record GachaProofMaterial(
        List<GachaDrawProofItemResponse> proofItems,
        String resultDigest,
        String anchorPayload
) {
}
