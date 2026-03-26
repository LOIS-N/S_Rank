package com.ssafy.srank.rabbitmq.log.consumer;

import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.RabbitMqMetrics;
import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.UserAchievementLogMessage;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class UserAchievementLogConsumer {

    private final RabbitMqMetrics rabbitMqMetrics;

    public UserAchievementLogConsumer(RabbitMqMetrics rabbitMqMetrics) {
        this.rabbitMqMetrics = rabbitMqMetrics;
    }

    @RabbitListener(queues = RabbitMqConfig.LOG_ACHIEVEMENT_QUEUE)
    public void handle(UserAchievementLogMessage message) {
        rabbitMqMetrics.recordConsume(
                0L,
                RabbitMqConfig.LOG_ACHIEVEMENT_QUEUE,
                message.getClass().getSimpleName(),
                MetricTagValues.RESULT_SUCCESS,
                MetricTagValues.ERROR_CODE_NONE
        );
    }
}
