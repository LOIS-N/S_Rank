package com.ssafy.srank.ranking.presentation.controller;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.ranking.application.dto.response.CardGradeCountRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.CardStatTotalRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.GoldRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.RankingResponse;
import com.ssafy.srank.ranking.application.service.RankingQueryService;
import com.ssafy.srank.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final RankingQueryService rankingQueryService;

    @GetMapping("/gold")
    public ResponseEntity<ApiResponse<RankingResponse<GoldRankingItemResponse>>> getGoldRankings() {
        return ResponseEntity.ok(ApiResponse.success(rankingQueryService.getGoldRankings(SecurityUtil.getCurrentUserId())));
    }

    @GetMapping("/cards/grade-count")
    public ResponseEntity<ApiResponse<RankingResponse<CardGradeCountRankingItemResponse>>> getCardGradeCountRankings() {
        return ResponseEntity.ok(ApiResponse.success(rankingQueryService.getCardGradeCountRankings(SecurityUtil.getCurrentUserId())));
    }

    @GetMapping("/cards/stat-total")
    public ResponseEntity<ApiResponse<RankingResponse<CardStatTotalRankingItemResponse>>> getCardStatTotalRankings() {
        return ResponseEntity.ok(ApiResponse.success(rankingQueryService.getCardStatTotalRankings(SecurityUtil.getCurrentUserId())));
    }
}
