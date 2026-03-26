package com.ssafy.srank.rabbitmq.log.consumer;

import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.RabbitMqMetrics;
import com.ssafy.srank.log.application.facade.SynthesisLogFacade;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.SynthesisLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component
public class SynthesisLogConsumer {

    private final SynthesisLogFacade facade;
    private final RabbitMqMetrics rabbitMqMetrics;

    @RabbitListener(queues = RabbitMqConfig.LOG_SYNTHESIS_QUEUE)
    public void handle(SynthesisLogMessage message) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;
        try {
            facade.record(message);
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            rabbitMqMetrics.recordConsume(
                    System.nanoTime() - startNanos,
                    RabbitMqConfig.LOG_SYNTHESIS_QUEUE,
                    message.getClass().getSimpleName(),
                    result,
                    errorCode
            );
        }
    }
}
