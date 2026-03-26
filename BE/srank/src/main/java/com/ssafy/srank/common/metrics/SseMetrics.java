package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

@Component
@RequiredArgsConstructor
// SSE 연결 수와 이벤트 전송 결과를 기록한다.
public class SseMetrics {

    private final MeterRegistry meterRegistry;

    // 현재 활성 SSE 연결 수를 gauge로 바인딩한다.
    public void bindConnectionGauge(Supplier<Number> connectionSupplier) {
        Gauge.builder("srank.sse.connections", connectionSupplier, supplier -> supplier.get().doubleValue())
                .description("Current active SSE connections")
                .register(meterRegistry);
    }

    // SSE 연결 생성, 종료 같은 라이프사이클 이벤트를 기록한다.
    public void recordConnection(String event, String result) {
        Counter.builder("srank.sse.connection.total")
                .description("SSE connection lifecycle events")
                .tags("event", event, "result", result)
                .register(meterRegistry)
                .increment();
    }

    // SSE 이벤트 전송 결과와 시간을 event 기준으로 기록한다.
    public void recordSend(String event, String result, long durationNanos) {
        Counter.builder("srank.sse.send.total")
                .description("SSE send outcomes")
                .tags("event", event, "result", result)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.sse.send.duration")
                .description("SSE send duration")
                .tags("event", event, "result", result)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }
}
