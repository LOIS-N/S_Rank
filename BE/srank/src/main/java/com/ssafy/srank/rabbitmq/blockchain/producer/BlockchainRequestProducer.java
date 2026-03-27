package com.ssafy.srank.rabbitmq.blockchain.producer;

import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.RabbitMqMetrics;
import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainRequestMessage;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BlockchainRequestProducer {

    private final RabbitTemplate rabbitTemplate;
    private final RabbitMqMetrics rabbitMqMetrics;

    public void send(BlockchainRequestMessage message) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMqConfig.BLOCKCHAIN_EXCHANGE,
                    RabbitMqConfig.BLOCKCHAIN_ROUTING_KEY,
                    message
            );
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            rabbitMqMetrics.recordPublish(
                    System.nanoTime() - startNanos,
                    RabbitMqConfig.BLOCKCHAIN_EXCHANGE,
                    RabbitMqConfig.BLOCKCHAIN_ROUTING_KEY,
                    message.getClass().getSimpleName(),
                    result,
                    errorCode
            );
        }
    }
}
