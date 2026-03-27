package com.ssafy.srank.rabbitmq.blockchain.consumer;

import com.ssafy.srank.blockchain.application.dto.NftMintResult;
import com.ssafy.srank.blockchain.application.service.LedgerWriteService;
import com.ssafy.srank.blockchain.application.service.NftWriteService;
import com.ssafy.srank.blockchain.application.service.PinataService;
import com.ssafy.srank.blockchain.application.service.TokenWriteService;
import com.ssafy.srank.blockchain.config.BlockchainProperties;
import com.ssafy.srank.card.application.service.UserCardService;
import com.ssafy.srank.common.metrics.BlockchainMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.RabbitMqMetrics;
import com.ssafy.srank.market.domain.entity.MarketItem;
import com.ssafy.srank.market.domain.entity.MarketTradeHistory;
import com.ssafy.srank.market.repository.MarketItemRepository;
import com.ssafy.srank.market.repository.MarketTradeHistoryRepository;
import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainRequestMessage;
import com.ssafy.srank.rabbitmq.blockchain.producer.BlockchainRequestProducer;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.sse.application.service.SseService;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlockchainRequestConsumer {

    private final PinataService pinataService;
    private final ObjectProvider<LedgerWriteService> ledgerWriteServiceProvider;
    private final ObjectProvider<NftWriteService> nftWriteServiceProvider;
    private final ObjectProvider<TokenWriteService> tokenWriteServiceProvider;
    private final BlockchainRequestProducer blockchainRequestProducer;
    private final BlockchainProperties blockchainProperties;
    private final RabbitMqMetrics rabbitMqMetrics;
    private final BlockchainMetrics blockchainMetrics;
    private final MarketItemRepository marketItemRepository;
    private final MarketTradeHistoryRepository marketTradeHistoryRepository;
    private final UserService userService;
    private final UserCardService userCardService;
    private final SseService sseService;

    @RabbitListener(queues = RabbitMqConfig.BLOCKCHAIN_QUEUE)
    public void handle(BlockchainRequestMessage message) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            String txHash = switch (message.eventType()) {
                // ── Ledger 컨트랙트 (GACHA / SYNTHESIS / ENHANCE) ──────────────
                case GACHA -> {
                    LedgerWriteService svc = requireLedgerWriteService();
                    yield svc.recordGacha(
                            message.walletAddress(),
                            message.serverSeed(),
                            message.clientSeed(),
                            message.count(),
                            message.gachaType(),
                            message.retryCount() + 1
                    );
                }
                case SYNTHESIS -> {
                    LedgerWriteService svc = requireLedgerWriteService();
                    yield svc.recordSynthesis(
                            message.walletAddress(),
                            message.consumedCardIds(),
                            message.retryCount() + 1
                    );
                }
                case ENHANCE -> {
                    LedgerWriteService svc = requireLedgerWriteService();
                    yield svc.recordEnhance(
                            message.walletAddress(),
                            message.serverSeed(),
                            message.clientSeed()
                    );
                }
                // ── NFT / Market 컨트랙트 (NFT_MINT / P2P_TRANSFER) ────────────
                case NFT_MINT -> handleNftMint(message);
                case P2P_TRANSFER -> handleP2pTransfer(message);
            };

            markSuccess(message, txHash);
        } catch (Exception e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            handleFailure(message, e);
        } finally {
            rabbitMqMetrics.recordConsume(
                    System.nanoTime() - startNanos,
                    RabbitMqConfig.BLOCKCHAIN_QUEUE,
                    message.getClass().getSimpleName(),
                    result,
                    errorCode
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NFT_MINT: grantMintRight → tokenId 추출 → listCard → markOnSale → SSE
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public String handleNftMint(BlockchainRequestMessage message) {
        Long marketItemId = message.marketItemId();
        Long userCardId = message.userCardId();

        MarketItem item = getMarketItem(marketItemId);

        Long sellerUserId = item.getSellerUserId();

        // 개발용 임시 처리
        boolean mockBlockchain = true;
        if (mockBlockchain) {
            String mockTokenId = "999999";
            String mockTxHash = "MOCK_TX_" + System.currentTimeMillis();

            item.markOnSale(mockTokenId);
            marketItemRepository.save(item);

            sseService.sendToUser(
                    sellerUserId,
                    "market.sell.ready",
                    "판매 등록이 완료되었습니다."
            );

            return mockTxHash;
        }

        NftWriteService nftWriteService = requireNftWriteService();
        String sellerWallet = userService.getWalletAddress(sellerUserId);

        String cardName = item.getUserCard().getCardTemplate().getCharacterName();
        String imageCid = item.getUserCard().getCardTemplate().getFrameImageUrl();

        String tokenUri = pinataService.uploadMetadataToIPFS(cardName, imageCid);

        NftMintResult mintResult = nftWriteService.mintNft(
                sellerWallet,
                userCardId,
                tokenUri
        );

        nftWriteService.listOnMarket(
                mintResult.tokenId(),
                BigInteger.valueOf(item.getPriceCoin().longValue())
        );

        item.markOnSale(mintResult.tokenId().toString());
        marketItemRepository.save(item);

        sseService.sendToUser(
                sellerUserId,
                "market.sell.ready",
                "판매 등록이 완료되었습니다."
        );

        return mintResult.txHash();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // P2P_TRANSFER: buyCard → markSold → changeOwner → 이력 저장 → SSE
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public String handleP2pTransfer(BlockchainRequestMessage message) {
        log.info("[P2P_TRANSFER] 시작 marketItemId={} userCardId={}",
                message.marketItemId(), message.userCardId());

        MarketItem item = getMarketItem(message.marketItemId());

        if (item.getBuyerUserId() == null) {
            throw new IllegalStateException(
                    "buyerUserId가 없습니다. buyItem()이 먼저 호출되어야 합니다. marketItemId=" + message.marketItemId());
        }

        Long buyerUserId = item.getBuyerUserId();
        Long sellerUserId = item.getSellerUserId();

        // 개발용 mock 처리
        boolean mockBlockchain = true;
        if (mockBlockchain) {
            String mockTxHash = "MOCK_BUY_TX_" + System.currentTimeMillis();

            item.markSold();
            marketItemRepository.save(item);

            userCardService.changeOwner(message.userCardId(), buyerUserId);

            marketTradeHistoryRepository.save(
                    MarketTradeHistory.ofSellCompleted(item, mockTxHash)
            );

            sseService.sendToUser(sellerUserId, "market.sell.completed", item.getMarketItemId());
            sseService.sendToUser(buyerUserId, "market.buy.completed", item.getMarketItemId());

            return mockTxHash;
        }

        if (item.getNftTokenId() == null) {
            throw new IllegalStateException(
                    "nftTokenId가 없습니다. NFT_MINT가 완료되지 않은 상태입니다. marketItemId=" + message.marketItemId());
        }

        NftWriteService nftWriteService = requireNftWriteService();
        BigInteger tokenId = new BigInteger(item.getNftTokenId());

        String txHash = nftWriteService.executeBuy(tokenId);

        log.info("[P2P_TRANSFER] 체인 처리 완료 txHash={}", txHash);

        item.markSold();
        marketItemRepository.save(item);

        userCardService.changeOwner(message.userCardId(), buyerUserId);

        marketTradeHistoryRepository.save(MarketTradeHistory.ofSellCompleted(item, txHash));

        sseService.sendToUser(sellerUserId, "market.sell.completed", item.getMarketItemId());
        sseService.sendToUser(buyerUserId, "market.buy.completed", item.getMarketItemId());

        return txHash;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 헬퍼
    // ─────────────────────────────────────────────────────────────────────────

    private LedgerWriteService requireLedgerWriteService() {
        LedgerWriteService service = ledgerWriteServiceProvider.getIfAvailable();
        if (service == null || !blockchainProperties.isLedgerConfigured()) {
            throw new IllegalStateException(
                    "Ledger 블록체인 설정이 없습니다 (rpc-url / private-key / ledger-address)");
        }
        return service;
    }

    private NftWriteService requireNftWriteService() {
        NftWriteService service = nftWriteServiceProvider.getIfAvailable();
        if (service == null || !blockchainProperties.isNftConfigured()) {
            throw new IllegalStateException(
                    "NFT 블록체인 설정이 없습니다 (card-nft-address / card-market-address)");
        }
        return service;
    }

    private TokenWriteService requireTokenWriteService() {
        TokenWriteService service = tokenWriteServiceProvider.getIfAvailable();
        if (service == null || !blockchainProperties.isTokenConfigured()) {
            throw new IllegalStateException(
                    "Token 블록체인 설정이 없습니다 (game-token-address)");
        }
        return service;
    }

    private MarketItem getMarketItem(Long marketItemId) {
        return marketItemRepository.findByIdWithUserCardAndTemplate(marketItemId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "market_item을 찾을 수 없습니다. id=" + marketItemId));
    }

    private void handleFailure(BlockchainRequestMessage message, Exception e) {
        log.error("failed to process blockchain request eventType={} retryCount={}",
                message.eventType(), message.retryCount(), e);

        if (message.retryCount() < blockchainProperties.getRetryMax()) {
            try {
                blockchainRequestProducer.send(message.incrementRetry());
                blockchainMetrics.recordRetry(
                        MetricTagValues.enumName(message.eventType()),
                        MetricTagValues.number(message.retryCount() + 1),
                        MetricTagValues.RESULT_SUCCESS
                );
                return;
            } catch (RuntimeException publishException) {
                blockchainMetrics.recordRetry(
                        MetricTagValues.enumName(message.eventType()),
                        MetricTagValues.number(message.retryCount() + 1),
                        MetricTagValues.RESULT_ERROR
                );
                log.error("failed to republish blockchain request eventType={} retryCount={}",
                        message.eventType(), message.retryCount(), publishException);
            }
        }

        markFailed(message);
    }

    private void markSuccess(BlockchainRequestMessage message, String txHash) {
        log.info("[BlockchainConsumer] 완료 eventType={} txHash={}", message.eventType(), txHash);
    }

    private void markFailed(BlockchainRequestMessage message) {
        log.warn("[BlockchainConsumer] 최종 실패 eventType={} retryCount={}",
                message.eventType(), message.retryCount());

        // 마켓 이벤트 실패 시 item 상태를 FAILED로 전환
        if (message.marketItemId() != null) {
            marketItemRepository.findById(message.marketItemId()).ifPresent(item -> {
                item.markFailed();
                marketItemRepository.save(item);
                log.warn("[BlockchainConsumer] market_item FAILED 처리 marketItemId={}", item.getMarketItemId());
            });
        }
    }
}
