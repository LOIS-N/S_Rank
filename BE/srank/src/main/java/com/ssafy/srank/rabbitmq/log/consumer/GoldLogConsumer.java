package com.ssafy.srank.rabbitmq.log.consumer;

import com.ssafy.srank.log.application.facade.EconomyLogFacade;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.GoldLogMessage;
import com.ssafy.srank.rabbitmq.log.message.UserAuthMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component  
public class GoldLogConsumer {

    private final EconomyLogFacade facade;
  
    @RabbitListener(queues = RabbitMqConfig.LOG_GOLD_QUEUE)
    public void handle(GoldLogMessage message) {
        facade.recordGoldChange(message);
    }
}