package com.ssafy.srank.ranking.application.dto.response;

public record CardGradeCountRankingItemResponse(
        int rank,
        String nickname,
        long sCount,
        long aCount
) {
}
