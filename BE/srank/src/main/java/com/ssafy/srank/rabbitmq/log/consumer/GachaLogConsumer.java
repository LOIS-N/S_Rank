package com.ssafy.srank.rabbitmq.log.consumer;

import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.RabbitMqMetrics;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.GachaLogMessage;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class GachaLogConsumer {

    private final RabbitMqMetrics rabbitMqMetrics;

    public GachaLogConsumer(RabbitMqMetrics rabbitMqMetrics) {
        this.rabbitMqMetrics = rabbitMqMetrics;
    }

    @RabbitListener(queues = RabbitMqConfig.LOG_GACHA_QUEUE)
    public void handle(GachaLogMessage message) {
        recordConsume(RabbitMqConfig.LOG_GACHA_QUEUE, message);
    }

    private void recordConsume(String queue, GachaLogMessage message) {
        long startNanos = System.nanoTime();
        rabbitMqMetrics.recordConsume(
                System.nanoTime() - startNanos,
                queue,
                message.getClass().getSimpleName(),
                MetricTagValues.RESULT_SUCCESS,
                MetricTagValues.ERROR_CODE_NONE
        );
    }
}
