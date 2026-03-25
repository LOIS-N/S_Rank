package com.ssafy.srank.card.application.dto.request;

import java.util.List;

public record DeleteCardRequest (
        List<Long> cards
){}
