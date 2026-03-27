package com.ssafy.srank.market.application.service;

import com.ssafy.srank.market.application.dto.request.RegisterMarketItemRequest;
import com.ssafy.srank.market.application.dto.response.MarketItemResponse;
import com.ssafy.srank.market.application.dto.response.SellableCardResponse;
import com.ssafy.srank.market.application.dto.response.TradeHistoryResponse;

import java.util.List;

public interface MarketService {

    /** 구매 가능 카드 목록 조회 */
    List<MarketItemResponse> getMarketItems();

    /** 판매 가능 카드 목록 조회 (내 S등급 카드 중 OWNED 상태) */
    List<SellableCardResponse> getSellableCards(Long userId);

    /** 내 거래 내역 조회 */
    List<TradeHistoryResponse> getMyTradeHistories(Long userId);

    /** 카드 판매 등록 */
    void registerItem(Long userId, RegisterMarketItemRequest request);

    /** 카드 구매 */
    void buyItem(Long buyerUserId, Long marketItemId);
}
