package com.ssafy.srank.rabbitmq.blockchain.producer;

import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainRequestMessage;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BlockchainRequestProducer {

    private final RabbitTemplate rabbitTemplate;

    public void send(BlockchainRequestMessage message) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.BLOCKCHAIN_EXCHANGE,
                RabbitMqConfig.BLOCKCHAIN_ROUTING_KEY,
                message
        );
    }
}
