package com.ssafy.srank.rabbitmq.log.producer;

import com.ssafy.srank.rabbitmq.config.RabbitMqConfig;
import com.ssafy.srank.rabbitmq.log.message.SynthesisLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 합성(Synthesis) 로그 메시지를 RabbitMQ로 발행하는 Producer
 * Exchange: log.exchange / RoutingKey: log.synthesis.info
 */
@Component
@RequiredArgsConstructor
public class SynthesisLogProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 합성 로그 메시지 발행
     *
     * @param message SynthesisLogMessage — 합성 시도 결과 정보
     */
    public void sendSynthesisLogMessage(SynthesisLogMessage message) {
        rabbitTemplate.convertAndSend(
                RabbitMqConfig.LOG_EXCHANGE,
                RabbitMqConfig.LOG_SYNTHESIS_ROUTING_KEY,
                message
        );
    }
}
