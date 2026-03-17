package com.ssafy.srank.gacha.application.dto.response;

import java.util.List;

public record GachaDrawResponse(
        String gachaType,
        int drawCount,
        long spentGold,
        long remainingGold,
        List<GachaDrawCardResponse> cards
) {
}
