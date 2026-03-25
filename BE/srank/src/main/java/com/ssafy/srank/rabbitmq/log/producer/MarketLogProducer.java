package com.ssafy.srank.rabbitmq.log.producer;

import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.MarketLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 거래(Market) 로그 메시지를 RabbitMQ로 발행하는 Producer
 * Exchange: log.exchange / RoutingKey: log.market.info
 */
@Component
@RequiredArgsConstructor
public class MarketLogProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 거래 로그 메시지 발행
     *
     * @param message MarketLogMessage — 거래 이벤트(구매/취소 등) 정보
     */
    public void sendMarketLogMessage(MarketLogMessage message) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.LOG_EXCHANGE,
                RabbitMqConfig.LOG_MARKET_ROUTING_KEY,
                message
        );
    }
}
