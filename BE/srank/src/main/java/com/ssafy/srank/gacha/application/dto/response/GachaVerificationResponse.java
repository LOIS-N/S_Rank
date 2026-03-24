package com.ssafy.srank.gacha.application.dto.response;

import java.util.List;

public record GachaVerificationResponse(
        List<GachaDrawCardResponse> cards,
        GachaProofResponse proof
) {
}
