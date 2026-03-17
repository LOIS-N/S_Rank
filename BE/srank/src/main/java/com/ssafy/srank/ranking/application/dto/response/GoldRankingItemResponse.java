package com.ssafy.srank.ranking.application.dto.response;

public record GoldRankingItemResponse(
        int rank,
        String nickname,
        long gold
) {
}
