package com.ssafy.srank.rabbitmq.log.producer;

import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.QuestMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 퀘스트(Quest) 로그 메시지를 RabbitMQ로 발행하는 Producer
 * Exchange: log.exchange / RoutingKey: log.quest.info
 */
@Component
@RequiredArgsConstructor
public class QuestLogProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 퀘스트 로그 메시지 발행
     *
     * @param message QuestMessage — 퀘스트 시작/완료 상태 정보
     */
    public void sendQuestLogMessage(QuestMessage message) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.LOG_EXCHANGE,
                RabbitMqConfig.LOG_QUEST_ROUTING_KEY,
                message
        );
    }
}
