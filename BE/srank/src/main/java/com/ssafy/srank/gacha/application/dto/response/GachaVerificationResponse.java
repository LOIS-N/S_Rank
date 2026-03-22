package com.ssafy.srank.gacha.application.dto.response;

import com.ssafy.srank.gacha.domain.enums.GachaType;

import java.util.List;

public record GachaVerificationResponse(
        List<GachaDrawCardResponse> cards,
        String nextCursor,
        boolean hasMore,
        GachaType gachaType,
        int drawCount,
        GachaProofResponse proof,
        boolean serverSeedHashVerified
) {
}
