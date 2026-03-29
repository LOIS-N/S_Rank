package com.ssafy.srank.market.repository;

import com.ssafy.srank.market.domain.entity.MarketItem;
import com.ssafy.srank.market.domain.enums.MarketItemStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MarketItemRepository extends JpaRepository<MarketItem, Long> {

    /** 구매 가능 카드 목록 (ON_SALE 상태만, userCard fetch join) */
    @Query("SELECT mi FROM MarketItem mi JOIN FETCH mi.userCard uc JOIN FETCH uc.cardTemplate WHERE mi.status = 'ON_SALE'")
    List<MarketItem> findAllOnSaleWithCard();

    /** 구매 시 동시성 제어용 비관적 락 조회 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT mi FROM MarketItem mi WHERE mi.marketItemId = :id")
    Optional<MarketItem> findByIdWithLock(@Param("id") Long id);

    @Query("""
        select mi
        from MarketItem mi
        join fetch mi.userCard uc
        join fetch uc.cardTemplate ct
        where mi.marketItemId = :marketItemId
    """)
    Optional<MarketItem> findByIdWithUserCardAndTemplate(Long marketItemId);

    @Query("""
        SELECT mi FROM MarketItem mi
        JOIN FETCH mi.userCard uc
        JOIN FETCH uc.cardTemplate
        WHERE mi.sellerUserId = :userId OR mi.buyerUserId = :userId
        ORDER BY mi.createdAt DESC
    """)
    List<MarketItem> findMyTradeItemsWithCard(@Param("userId") Long userId);
}
