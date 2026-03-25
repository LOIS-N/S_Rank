package com.ssafy.srank.rabbitmq.log.producer;

import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.EnhanceLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 강화(Enhancement) 로그 메시지를 RabbitMQ로 발행하는 Producer
 * Exchange: log.exchange / RoutingKey: log.enhance.info
 */
@Component
@RequiredArgsConstructor
public class EnhanceLogProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 강화 로그 메시지 발행
     *
     * @param message EnhanceLogMessage — 강화 시도 결과 정보
     */
    public void sendEnhanceLogMessage(EnhanceLogMessage message) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.LOG_EXCHANGE,
                RabbitMqConfig.LOG_ENHANCE_ROUTING_KEY,
                message
        );
    }
}
