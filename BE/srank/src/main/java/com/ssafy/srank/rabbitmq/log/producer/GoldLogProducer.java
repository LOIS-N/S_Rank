package com.ssafy.srank.rabbitmq.log.producer;

import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.GoldLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 골드(Gold) 로그 메시지를 RabbitMQ로 발행하는 Producer
 * Exchange: log.exchange / RoutingKey: log.gold.info
 */
@Component
@RequiredArgsConstructor
public class GoldLogProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 골드 로그 메시지 발행
     *
     * @param message GoldLogMessage — 골드 증감 내역 정보
     */
    public void sendGoldLogMessage(GoldLogMessage message) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.LOG_EXCHANGE,
                RabbitMqConfig.LOG_GOLD_ROUTING_KEY,
                message
        );
    }
}
