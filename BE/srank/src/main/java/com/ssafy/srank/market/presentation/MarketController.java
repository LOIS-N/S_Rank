package com.ssafy.srank.market.presentation;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.market.application.dto.request.RegisterMarketItemRequest;
import com.ssafy.srank.market.application.dto.response.MarketItemResponse;
import com.ssafy.srank.market.application.dto.response.SellableCardResponse;
import com.ssafy.srank.market.application.dto.response.TradeHistoryResponse;
import com.ssafy.srank.market.application.service.MarketService;
import com.ssafy.srank.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/market")
@RequiredArgsConstructor
public class MarketController {

    private final MarketService marketService;

    /**
     * 구매 가능 카드 목록 조회
     * GET /api/v1/market/items
     */
    @GetMapping("/items")
    public ResponseEntity<ApiResponse<Map<String, List<MarketItemResponse>>>> getMarketItems() {
        List<MarketItemResponse> items = marketService.getMarketItems();
        return ResponseEntity.ok(ApiResponse.success(Map.of("items", items)));
    }

    /**
     * 판매 가능 카드 목록 조회 (내 S등급 카드)
     * GET /api/v1/market/my/sellable-cards
     */
    @GetMapping("/my/sellable-cards")
    public ResponseEntity<ApiResponse<Map<String, List<SellableCardResponse>>>> getSellableCards() {
        List<SellableCardResponse> items = marketService.getSellableCards(SecurityUtil.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("items", items)));
    }

    /**
     * 내 거래 내역 조회
     * GET /api/v1/market/my/histories
     */
    @GetMapping("/my/histories")
    public ResponseEntity<ApiResponse<Map<String, List<TradeHistoryResponse>>>> getMyHistories() {
        List<TradeHistoryResponse> items = marketService.getMyTradeHistories(SecurityUtil.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("histories", items)));
    }

    /**
     * 카드 판매 등록
     * POST /api/v1/market/items
     */
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<Void>> registerItem(@RequestBody RegisterMarketItemRequest request) {
        marketService.registerItem(SecurityUtil.getCurrentUserId(), request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 카드 구매
     * POST /api/v1/market/items/{marketItemId}/buy
     */
    @PostMapping("/items/{marketItemId}/buy")
    public ResponseEntity<ApiResponse<Void>> buyItem(@PathVariable Long marketItemId) {
        marketService.buyItem(SecurityUtil.getCurrentUserId(), marketItemId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
