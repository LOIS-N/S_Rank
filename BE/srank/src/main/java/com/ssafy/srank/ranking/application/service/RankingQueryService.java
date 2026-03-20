package com.ssafy.srank.ranking.application.service;

import com.ssafy.srank.ranking.application.dto.response.CardGradeCountRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.CardStatTotalRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.GoldRankingItemResponse;

import java.util.List;

public interface RankingQueryService {

    List<GoldRankingItemResponse> getGoldRankings();

    List<CardGradeCountRankingItemResponse> getCardGradeCountRankings();

    List<CardStatTotalRankingItemResponse> getCardStatTotalRankings();
}
