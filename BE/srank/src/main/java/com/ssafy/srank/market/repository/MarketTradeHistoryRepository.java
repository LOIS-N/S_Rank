package com.ssafy.srank.market.repository;

import com.ssafy.srank.market.domain.entity.MarketTradeHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MarketTradeHistoryRepository extends JpaRepository<MarketTradeHistory, Long> {

    /** 내 거래 내역 조회 (판매자 or 구매자 모두 포함, userCard fetch join) */
    @Query("""
            SELECT h FROM MarketTradeHistory h
            JOIN FETCH h.userCard uc
            JOIN FETCH uc.cardTemplate
            WHERE h.sellerUserId = :userId OR h.buyerUserId = :userId
            ORDER BY h.eventAt DESC
            """)
    List<MarketTradeHistory> findMyHistoriesWithCard(@Param("userId") Long userId);
}
