package com.ssafy.srank.rabbitmq.blockchain.consumer;

import com.ssafy.srank.blockchain.application.service.LedgerWriteService;
import com.ssafy.srank.blockchain.config.BlockchainProperties;
import com.ssafy.srank.common.metrics.BlockchainMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.RabbitMqMetrics;
import com.ssafy.srank.log.application.facade.GachaLogFacade;
import com.ssafy.srank.log.application.facade.SynthesisLogFacade;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;
import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainEventType;
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
    private final GachaLogFacade gachaLogFacade;
    private final SynthesisLogFacade synthesisLogFacade;
    private final RabbitMqMetrics rabbitMqMetrics;
    private final BlockchainMetrics blockchainMetrics;

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
        log.error("failed to process blockchain request eventType={} logIds={} retryCount={}",
                message.eventType(), message.logIds(), message.retryCount(), e);

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
                log.error("failed to republish blockchain request eventType={} logIds={} retryCount={}",
                        message.eventType(), message.logIds(), message.retryCount(), publishException);
            }
        }

        markFailed(message);
    }

    private void markSuccess(BlockchainRequestMessage message, String txHash) {
        if (message.eventType() == BlockchainEventType.GACHA) {
            gachaLogFacade.updateBlockchainResult(message.logIds(), BlockchainStatus.SUCCESS, txHash);
            return;
        }
        synthesisLogFacade.updateBlockchainResult(message.logIds().get(0), BlockchainStatus.SUCCESS, txHash);
    }

    private void markFailed(BlockchainRequestMessage message) {
        if (message.eventType() == BlockchainEventType.GACHA) {
            gachaLogFacade.updateBlockchainResult(message.logIds(), BlockchainStatus.FAILED, null);
            return;
        }
        synthesisLogFacade.updateBlockchainResult(message.logIds().get(0), BlockchainStatus.FAILED, null);
    }
}
