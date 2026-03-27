package com.ssafy.srank.ranking.application.dto.response;

import java.util.List;

public record RankingResponse<T>(
        List<T> topRankings,
        T myRanking
) {
}
