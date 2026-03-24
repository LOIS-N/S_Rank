package com.ssafy.srank.common.cardcreation;

import com.ssafy.srank.card.domain.enums.CardGrade;

public record CardCreationCommand(
        Long userId,
        CardGrade grade
) {
}
