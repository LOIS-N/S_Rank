package com.ssafy.srank.log.application.command;

import com.ssafy.srank.gacha.domain.enums.GachaType;

import java.time.LocalDateTime;
import java.util.List;

public record GachaDrawLogCommand(
        Long userId,
        GachaType gachaType,
        int drawCount,
        long totalCost,
        boolean tutorial,
        List<GachaDrawnCardLogCommand> drawnCards,
        LocalDateTime createdAt
) {
}
