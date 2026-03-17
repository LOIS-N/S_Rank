package com.ssafy.srank.ranking.presentation.controller;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.ranking.application.dto.response.CardGradeCountRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.CardStatTotalRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.GoldRankingItemResponse;
import com.ssafy.srank.ranking.application.service.RankingQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final RankingQueryService rankingQueryService;

    /**
     * 배치가 만들어 둔 누적 골드 랭킹 스냅샷을 조회한다.
     */
    @GetMapping("/gold")
    public ResponseEntity<ApiResponse<List<GoldRankingItemResponse>>> getGoldRankings() {
        return ResponseEntity.ok(ApiResponse.success(rankingQueryService.getGoldRankings()));
    }

    /**
     * 배치가 만들어 둔 유저별 S/A 등급 카드 보유 랭킹 스냅샷을 조회한다.
     */
    @GetMapping("/cards/grade-count")
    public ResponseEntity<ApiResponse<List<CardGradeCountRankingItemResponse>>> getCardGradeCountRankings() {
        return ResponseEntity.ok(ApiResponse.success(rankingQueryService.getCardGradeCountRankings()));
    }

    /**
     * 배치가 만들어 둔 카드 능력치 총합 랭킹 스냅샷을 조회한다.
     */
    @GetMapping("/cards/stat-total")
    public ResponseEntity<ApiResponse<List<CardStatTotalRankingItemResponse>>> getCardStatTotalRankings() {
        return ResponseEntity.ok(ApiResponse.success(rankingQueryService.getCardStatTotalRankings()));
    }
}
