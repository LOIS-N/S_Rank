package com.ssafy.srank.gacha.application.service.model;

import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawProofItemResponse;

public record PreparedDraw(
        UserCard userCard,
        GachaDrawProofItemResponse proofItem
) {
}
