package com.ssafy.srank.quest.application.dto.request;

import java.util.List;

public record MainQuestRequest (
    Long deskId,
    List<Long> cardIds
){

}