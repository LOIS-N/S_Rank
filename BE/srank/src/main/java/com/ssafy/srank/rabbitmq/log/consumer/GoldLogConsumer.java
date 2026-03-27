package com.ssafy.srank.rabbitmq.log.consumer;

import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.RabbitMqMetrics;
import com.ssafy.srank.log.application.facade.EconomyLogFacade;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.GoldLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component
public class GoldLogConsumer {

    private final EconomyLogFacade facade;
    private final RabbitMqMetrics rabbitMqMetrics;

    @RabbitListener(queues = RabbitMqConfig.LOG_GOLD_QUEUE)
    public void handle(GoldLogMessage message) {
        recordConsume(RabbitMqConfig.LOG_GOLD_QUEUE, message, () -> facade.recordGoldChange(message));
    }

    private void recordConsume(String queue, GoldLogMessage message, Runnable runnable) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;
        try {
            runnable.run();
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            rabbitMqMetrics.recordConsume(System.nanoTime() - startNanos, queue, message.getClass().getSimpleName(), result, errorCode);
        }
    }
}
