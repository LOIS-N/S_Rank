package com.ssafy.srank.rabbitmq.log.producer;

import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.GachaLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 뽑기(Gacha) 로그 메시지를 RabbitMQ로 발행하는 Producer
 * Exchange: log.exchange / RoutingKey: log.gacha.info
 */
@Component
@RequiredArgsConstructor
public class GachaLogProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 뽑기 로그 메시지 발행
     *
     * @param message GachaLogMessage — 뽑기 1회 결과 정보
     */
    public void sendGachaLogMessage(GachaLogMessage message) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.LOG_EXCHANGE,
                RabbitMqConfig.LOG_GACHA_ROUTING_KEY,
                message
        );
    }
}
