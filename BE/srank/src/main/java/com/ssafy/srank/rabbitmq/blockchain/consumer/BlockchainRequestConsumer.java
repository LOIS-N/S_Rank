package com.ssafy.srank.rabbitmq.blockchain.consumer;

import com.ssafy.srank.blockchain.application.service.LedgerWriteService;
import com.ssafy.srank.blockchain.config.BlockchainProperties;
import com.ssafy.srank.common.metrics.BlockchainMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.RabbitMqMetrics;
import com.ssafy.srank.market.repository.MarketItemRepository;
import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainRequestMessage;
import com.ssafy.srank.rabbitmq.blockchain.producer.BlockchainRequestProducer;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlockchainRequestConsumer {

    private final ObjectProvider<LedgerWriteService> ledgerWriteServiceProvider;
    private final BlockchainRequestProducer blockchainRequestProducer;
    private final BlockchainProperties blockchainProperties;
    private final RabbitMqMetrics rabbitMqMetrics;
    private final BlockchainMetrics blockchainMetrics;
    private final MarketItemRepository marketItemRepository;

    @RabbitListener(queues = RabbitMqConfig.BLOCKCHAIN_QUEUE)
    public void handle(BlockchainRequestMessage message) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            LedgerWriteService ledgerWriteService = ledgerWriteServiceProvider.getIfAvailable();
            if (ledgerWriteService == null || !blockchainProperties.isConfigured()) {
                throw new IllegalStateException("blockchain ledger configuration is not available");
            }

            String txHash = switch (message.eventType()) {
                case GACHA -> ledgerWriteService.recordGacha(
                        message.walletAddress(),
                        message.serverSeed(),
                        message.clientSeed(),
                        message.count(),
                        message.gachaType(),
                        message.retryCount() + 1
                );
                case SYNTHESIS -> ledgerWriteService.recordSynthesis(
                        message.walletAddress(),
                        message.consumedCardIds(),
                        message.retryCount() + 1
                );
                case ENHANCE -> ledgerWriteService.recordEnhance(
                        message.walletAddress(),
                        message.serverSeed(),
                        message.clientSeed()
                );
                case NFT_MINT -> {
                    // 지금은 marketItemId = consumedCardIds.get(0), userCardId = consumedCardIds.get(1)
                    Long marketItemId = message.consumedCardIds().get(0);

                    log.info("[Market] NFT_MINT 요청 수신 marketItemId={}", marketItemId);

                    // market_item 상태 ON_SALE로 업데이트
                    marketItemRepository.findById(marketItemId).ifPresent(item -> {
                        item.markOnSale("NFT_STUB_" + marketItemId); // TODO: 실제 txHash/tokenId로 교체
                        marketItemRepository.save(item);
                    });

                    // SSE로 판매자에게 알림
                    // TODO: sellerUserId 조회 후 sseService.sendToUser(sellerUserId, "market.sell.ready", ...)
                    yield "NFT_STUB_TX_" + marketItemId;
                }

                case P2P_TRANSFER -> {
                    // TODO: 블록체인 서비스 연동 시 실제 소유권 이전 로직으로 교체
                    Long marketItemId = message.consumedCardIds().get(0);
                    log.info("[Market] P2P_TRANSFER 요청 수신 marketItemId={}", marketItemId);

                    // market_item 상태 SOLD로 업데이트, user_card 소유자 변경
                    marketItemRepository.findById(marketItemId).ifPresent(item -> {
                        item.markSold();
                        marketItemRepository.save(item);
                    });

                    // SSE로 구매자/판매자 모두 알림
                    // TODO: sseService.sendToUser(buyerUserId, "market.buy.completed", ...)
                    //        sseService.sendToUser(sellerUserId, "market.sell.completed", ...)
                    yield "P2P_STUB_TX_" + marketItemId;
                }
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
        log.info("blockchain request completed eventType={} txHash={}", message.eventType(), txHash);
    }

    private void markFailed(BlockchainRequestMessage message) {
        log.warn("blockchain request failed eventType={} retryCount={}", message.eventType(), message.retryCount());
    }
}
