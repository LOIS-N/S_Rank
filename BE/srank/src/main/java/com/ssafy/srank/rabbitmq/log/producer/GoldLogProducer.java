package com.ssafy.srank.rabbitmq.log.producer;

import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.RabbitMqMetrics;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.GoldLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GoldLogProducer {

    private final RabbitTemplate rabbitTemplate;
    private final RabbitMqMetrics rabbitMqMetrics;

    public void sendGoldLogMessage(GoldLogMessage message) {
        publish(RabbitMqConfig.LOG_GOLD_ROUTING_KEY, message);
    }

    private void publish(String routingKey, GoldLogMessage message) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            rabbitTemplate.convertAndSend(RabbitMqConfig.LOG_EXCHANGE, routingKey, message);
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            rabbitMqMetrics.recordPublish(
                    System.nanoTime() - startNanos,
                    RabbitMqConfig.LOG_EXCHANGE,
                    routingKey,
                    message.getClass().getSimpleName(),
                    result,
                    errorCode
            );
        }
    }
}
