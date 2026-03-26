package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// RabbitMQ publish, consume 경계에서 전송 결과를 기록한다.
public class RabbitMqMetrics {

    private final MeterRegistry meterRegistry;

    // 메시지 publish 결과와 시간을 exchange, routing_key 기준으로 기록한다.
    public void recordPublish(
            long durationNanos,
            String exchange,
            String routingKey,
            String messageType,
            String result,
            String errorCode
    ) {
        Counter.builder("srank.rabbitmq.publish.total")
                .description("RabbitMQ publish outcomes")
                .tags(
                        "exchange", exchange,
                        "routing_key", routingKey,
                        "message_type", messageType,
                        "result", result,
                        "error_code", errorCode
                )
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.rabbitmq.publish.duration")
                .description("RabbitMQ publish duration")
                .tags(
                        "exchange", exchange,
                        "routing_key", routingKey,
                        "message_type", messageType,
                        "result", result,
                        "error_code", errorCode
                )
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 메시지 consume 결과와 시간을 queue 기준으로 기록한다.
    public void recordConsume(
            long durationNanos,
            String queue,
            String messageType,
            String result,
            String errorCode
    ) {
        Counter.builder("srank.rabbitmq.consume.total")
                .description("RabbitMQ consume outcomes")
                .tags(
                        "queue", queue,
                        "message_type", messageType,
                        "result", result,
                        "error_code", errorCode
                )
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.rabbitmq.consume.duration")
                .description("RabbitMQ consume duration")
                .tags(
                        "queue", queue,
                        "message_type", messageType,
                        "result", result,
                        "error_code", errorCode
                )
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }
}
