package com.ssafy.srank.user.application.listener;

import com.ssafy.srank.rabbitmq.log.producer.GoldLogProducer;
import com.ssafy.srank.user.application.event.GoldLogRequestedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class GoldLogRequestedEventListener {

    private final GoldLogProducer goldLogProducer;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(GoldLogRequestedEvent event) {
        goldLogProducer.sendGoldLogMessage(event.message());
    }
}
