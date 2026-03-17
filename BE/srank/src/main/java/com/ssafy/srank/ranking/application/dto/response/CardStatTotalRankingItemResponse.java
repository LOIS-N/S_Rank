package com.ssafy.srank.ranking.application.dto.response;

public record CardStatTotalRankingItemResponse(
        int rank,
        String cardName,
        int statTotal
) {
}
