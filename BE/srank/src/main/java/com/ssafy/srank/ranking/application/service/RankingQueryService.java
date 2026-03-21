package com.ssafy.srank.ranking.application.service;

import com.ssafy.srank.ranking.application.dto.response.CardGradeCountRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.CardStatTotalRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.GoldRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.RankingResponse;

public interface RankingQueryService {

    RankingResponse<GoldRankingItemResponse> getGoldRankings(Long userId);

    RankingResponse<CardGradeCountRankingItemResponse> getCardGradeCountRankings(Long userId);

    RankingResponse<CardStatTotalRankingItemResponse> getCardStatTotalRankings(Long userId);
}
