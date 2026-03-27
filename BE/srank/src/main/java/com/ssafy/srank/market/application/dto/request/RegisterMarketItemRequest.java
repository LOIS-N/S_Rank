package com.ssafy.srank.market.application.dto.request;

public record RegisterMarketItemRequest(
        Long userCardId,
        Long priceCoin
) {}