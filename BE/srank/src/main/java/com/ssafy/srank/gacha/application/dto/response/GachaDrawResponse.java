package com.ssafy.srank.gacha.application.dto.response;

import java.util.List;

public record GachaDrawResponse(
        List<GachaDrawCardResponse> cards,
        long remainingGold,
        GachaProofResponse proof
) {
}
