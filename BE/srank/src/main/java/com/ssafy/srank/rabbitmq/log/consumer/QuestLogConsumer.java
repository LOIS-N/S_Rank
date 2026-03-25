package com.ssafy.srank.rabbitmq.log.consumer;

import com.ssafy.srank.log.application.facade.QuestLogFacade;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.QuestMessage;
import com.ssafy.srank.rabbitmq.log.message.UserAuthMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class QuestLogConsumer {

    private final QuestLogFacade facade;
  
    @RabbitListener(queues = RabbitMqConfig.LOG_QUEST_QUEUE)
    public void handle(QuestMessage message) {
        facade.record(message);
    }
}