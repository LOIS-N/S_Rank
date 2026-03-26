package com.ssafy.srank.rabbitmq.blockchain.consumer;

import com.ssafy.srank.blockchain.application.service.LedgerWriteService;
import com.ssafy.srank.blockchain.config.BlockchainProperties;
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

    @RabbitListener(queues = RabbitMqConfig.BLOCKCHAIN_QUEUE)
    public void handle(BlockchainRequestMessage message) {
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
                        message.gachaType()
                );
                case SYNTHESIS -> ledgerWriteService.recordSynthesis(
                        message.walletAddress(),
                        message.consumedCardIds()
                );
                case ENHANCE -> ledgerWriteService.recordEnhance(
                        message.walletAddress(),
                        message.serverSeed(),
                        message.clientSeed()
                );
            };

            markSuccess(message, txHash);
        } catch (Exception e) {
            handleFailure(message, e);
        }
    }

    private void handleFailure(BlockchainRequestMessage message, Exception e) {
        log.error("failed to process blockchain request eventType={} logIds={} retryCount={}",
                message.eventType(), message.logIds(), message.retryCount(), e);

        if (message.retryCount() < blockchainProperties.getRetryMax()) {
            try {
                blockchainRequestProducer.send(message.incrementRetry());
                return;
            } catch (RuntimeException publishException) {
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
        if(message.eventType() == BlockchainEventType.ENHANCE) return;
        synthesisLogFacade.updateBlockchainResult(message.logIds().get(0), BlockchainStatus.FAILED, null);
    }
}
