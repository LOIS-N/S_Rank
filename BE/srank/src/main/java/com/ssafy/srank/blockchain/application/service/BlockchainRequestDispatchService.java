package com.ssafy.srank.blockchain.application.service;

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

    public void dispatchAfterCommit(BlockchainRequestMessage message) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            publish(message);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publish(message);
            }
        });
    }

    private void publish(BlockchainRequestMessage message) {
        try {
            blockchainRequestProducer.send(message);
        } catch (RuntimeException e) {
            log.error("failed to publish blockchain request eventType={} logIds={}",
                    message.eventType(), message.logIds(), e);
            markPublishFailure(message);
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
