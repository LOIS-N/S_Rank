package com.ssafy.srank.rabbitmq.log.producer;

import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.MarketItemLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 거래 아이템(MarketItem) 로그 메시지를 RabbitMQ로 발행하는 Producer
 * Exchange: log.exchange / RoutingKey: log.marketItem.info
 */
@Component
@RequiredArgsConstructor
public class MarketItemLogProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 거래 아이템 로그 메시지 발행
     *
     * @param message MarketItemLogMessage — 마켓 등록/만료/판매 아이템 정보
     */
    public void sendMarketItemLogMessage(MarketItemLogMessage message) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.LOG_EXCHANGE,
                RabbitMqConfig.LOG_MARKET_ITEM_ROUTING_KEY,
                message
        );
    }
}
