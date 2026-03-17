package com.ssafy.srank.gacha.application.dto.response;

import java.util.List;

public record GachaDrawResponse(
        String gachaType,
        int drawCount,
        long spentGold,
        long remainingGold,
        // 이번 요청에서 실제로 생성된 카드들만 담는다.
        List<GachaDrawCardResponse> cards
) {
}
