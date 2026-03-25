package com.ssafy.srank.rabbitmq.log.producer;

import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.UserAchievementLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 업적(Achievement) 로그 메시지를 RabbitMQ로 발행하는 Producer
 * Exchange: log.exchange / RoutingKey: log.achievement.info
 */
@Component
@RequiredArgsConstructor
public class UserAchievementLogProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 업적 로그 메시지 발행
     *
     * @param message UserAchievementLogMessage — 업적 달성/보상 수령 정보
     */
    public void sendUserAchievementLogMessage(UserAchievementLogMessage message) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.LOG_EXCHANGE,
                RabbitMqConfig.LOG_ACHIEVEMENT_ROUTING_KEY,
                message
        );
    }
}
