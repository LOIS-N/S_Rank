package com.ssafy.srank.rabbitmq.log.consumer;

import com.ssafy.srank.log.application.facade.EnhancementLogFacade;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.EnhanceLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component  
public class EnhanceLogConsumer {

    private final EnhancementLogFacade facade;
  
    @RabbitListener(queues = RabbitMqConfig.LOG_ENHANCE_QUEUE)
    public void handle(EnhanceLogMessage message) {
        facade.record(message);
    }
}