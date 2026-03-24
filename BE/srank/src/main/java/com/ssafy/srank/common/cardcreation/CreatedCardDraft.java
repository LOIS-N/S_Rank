package com.ssafy.srank.common.cardcreation;

import com.ssafy.srank.card.domain.entity.UserCard;

public record CreatedCardDraft(
        UserCard userCard,
        CardCreationMetadata metadata
) {
}
