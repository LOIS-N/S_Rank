package com.ssafy.srank.blockchain.application.service;

import com.ssafy.srank.common.metrics.BlockchainMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.log.application.facade.GachaLogFacade;
import com.ssafy.srank.log.application.facade.SynthesisLogFacade;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;
import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainEventType;
import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainRequestMessage;
import com.ssafy.srank.rabbitmq.blockchain.producer.BlockchainRequestProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Slf4j
@Service
@RequiredArgsConstructor
public class BlockchainRequestDispatchService {

    private final BlockchainRequestProducer blockchainRequestProducer;
    private final GachaLogFacade gachaLogFacade;
    private final SynthesisLogFacade synthesisLogFacade;
    private final BlockchainMetrics blockchainMetrics;

    public void dispatchAfterCommit(BlockchainRequestMessage message) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            publish(message, "immediate");
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publish(message, "after_commit");
            }
        });
    }

    private void publish(BlockchainRequestMessage message, String dispatchMode) {
        long startNanos = System.nanoTime();
        String eventType = MetricTagValues.enumName(message.eventType());
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            blockchainRequestProducer.send(message);
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            log.error("failed to publish blockchain request eventType={} logIds={}",
                    message.eventType(), message.logIds(), e);
            markPublishFailure(message);
        } finally {
            blockchainMetrics.recordDispatch(
                    System.nanoTime() - startNanos,
                    eventType,
                    dispatchMode,
                    result,
                    errorCode
            );
        }
    }

    private void markPublishFailure(BlockchainRequestMessage message) {
        if (message.eventType() == BlockchainEventType.GACHA) {
            gachaLogFacade.updateBlockchainResult(message.logIds(), BlockchainStatus.FAILED, null);
            return;
        }
        synthesisLogFacade.updateBlockchainResult(message.logIds().get(0), BlockchainStatus.FAILED, null);
    }
}
