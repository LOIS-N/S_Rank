package com.ssafy.srank.quest.application.dto.request;

import java.time.LocalDateTime;
import java.util.List;

public record SubQuestRequest (
        Long deskId,
        List<Long> cardIds,
        LocalDateTime startAt,
        LocalDateTime endAt
){

}