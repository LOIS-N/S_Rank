package com.ssafy.srank.market.application.service;

import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.application.service.UserCardService;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.MarketStatus;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.market.application.dto.request.RegisterMarketItemRequest;
import com.ssafy.srank.market.application.dto.response.MarketItemResponse;
import com.ssafy.srank.market.application.dto.response.SellableCardResponse;
import com.ssafy.srank.market.application.dto.response.TradeHistoryResponse;
import com.ssafy.srank.market.domain.entity.MarketItem;
import com.ssafy.srank.market.domain.entity.MarketTradeHistory;
import com.ssafy.srank.market.domain.enums.MarketItemStatus;
import com.ssafy.srank.market.repository.MarketItemRepository;
import com.ssafy.srank.market.repository.MarketTradeHistoryRepository;
import com.ssafy.srank.quest.application.service.QuestFacadeService;
import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainRequestMessage;
import com.ssafy.srank.rabbitmq.blockchain.producer.BlockchainRequestProducer;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class MarketServiceImpl implements MarketService {

    private final UserCardService userCardService;
    private final MarketItemRepository marketItemRepository;
    private final MarketTradeHistoryRepository marketTradeHistoryRepository;
    private final BlockchainRequestProducer blockchainRequestProducer;
    private final QuestFacadeService questFacadeService;
    private final UserService userService;

    // ─────────────────────────────────────────────────────────────────────────
    // 조회
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<MarketItemResponse> getMarketItems() {
        return marketItemRepository.findAllOnSaleWithCard()
                .stream()
                .map(MarketItemResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SellableCardResponse> getSellableCards(Long userId) {
        //사용중인 카드 조회
        Set<Long> usedUserCardList = new HashSet<>(questFacadeService.getUsedUserCardList(userId));

        return userCardService.getSellableUserCard(userId)
                .stream()
                .filter((card)->!usedUserCardList.contains(card.userCardId()))
                .filter((card)->card.grade().equals("S"))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TradeHistoryResponse> getMyTradeHistories(Long userId) {
        return marketTradeHistoryRepository.findMyHistoriesWithCard(userId)
                .stream()
                .map(TradeHistoryResponse::from)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 판매 등록
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void registerItem(Long userId, RegisterMarketItemRequest request) {
        // 1. 카드 소유 검증 + 상세 정보 조회
        UserCardResponse userCardInfo = userCardService.getUserCardDetail(userId, request.userCardId());

        // 2. S등급 카드만 판매 가능
        if (!"S".equals(userCardInfo.grade())) {
            throw new BusinessException(ErrorCode.TRADE_NOT_S_GRADE);
        }

        // 3. user_card 상태를 ON_SALE로 변경 → 퀘스트/강화/합성에서 사용 불가
        userCardService.changeMarketStatus(userId, request.userCardId(), MarketStatus.ON_SALE);

        // 4. UserCard 엔티티 레퍼런스 조회 (JPA 연관관계 설정용)
        UserCard userCard = userCardService.getUserCardEntity(request.userCardId());

        // 5. market_item 생성 (SALE_PENDING: 블록체인 처리 대기 중)
        MarketItem item = MarketItem.builder()
                .sellerUserId(userId)
                .userCard(userCard)
                .priceCoin(request.priceCoin())
                .status(MarketItemStatus.SALE_PENDING)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
        marketItemRepository.save(item);

        // 6. 거래 이력 기록 (판매 등록)
        marketTradeHistoryRepository.save(MarketTradeHistory.ofSellRegistered(item));

        // 7. RabbitMQ로 NFT_MINT 이벤트 발행
        //    → Consumer가 블록체인 처리 후 ON_SALE 전환 + SSE 알림
        String sellerWallet = userService.getWalletAddress(userId);
        blockchainRequestProducer.send(
                BlockchainRequestMessage.forNftMint(item.getMarketItemId(), userCard.getId(), sellerWallet)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 구매
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void buyItem(Long buyerUserId, Long marketItemId) {
        // 1. 비관적 락으로 market_item 조회 (동시 구매 방지)
        MarketItem item = marketItemRepository.findByIdWithLock(marketItemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRADE_LISTING_NOT_FOUND));

        // 2. 구매 가능 상태 검증
        if (item.getStatus() != MarketItemStatus.ON_SALE) {
            throw new BusinessException(ErrorCode.TRADE_ALREADY_SOLD);
        }

        // 3. 본인 카드 구매 불가
//        if (item.getSellerUserId().equals(buyerUserId)) {
//            throw new BusinessException(ErrorCode.TRADE_SELF_PURCHASE);
//        }

        // 4. 상태를 BUY_PENDING으로 전환 (다른 구매 요청 차단)
        item.markBuyPending(buyerUserId);

        // 5. 거래 이력 기록 (구매 요청)
        marketTradeHistoryRepository.save(MarketTradeHistory.ofBuyCompleted(item));

        // 6. RabbitMQ로 P2P_TRANSFER 이벤트 발행
        //    → Consumer가 블록체인 처리 후 SOLD 전환 + user_card 소유자 변경 + SSE 알림
        // TODO: UserService.getWalletAddress() 로 실제 지갑 주소 조회
        String sellerWallet = "TODO_WALLET_" + item.getSellerUserId();
        String buyerWallet = "TODO_WALLET_" + buyerUserId;

        blockchainRequestProducer.send(
                BlockchainRequestMessage.forP2pTransfer(
                        item.getMarketItemId(),
                        item.getUserCard().getId(),
                        sellerWallet,
                        buyerWallet,
                        item.getPriceCoin()
                )
        );
    }
}
