package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 블록체인 dispatch, ledger write, retry 흐름을 기록한다.
public class BlockchainMetrics {

    private final MeterRegistry meterRegistry;

    // 블록체인 요청 dispatch 결과와 시간을 기록한다.
    public void recordDispatch(long durationNanos, String eventType, String dispatchMode, String result, String errorCode) {
        Counter.builder("srank.blockchain.dispatch.total")
                .description("Blockchain dispatch outcomes")
                .tags(
                        "event_type", eventType,
                        "dispatch_mode", dispatchMode,
                        "result", result,
                        "error_code", errorCode
                )
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.blockchain.dispatch.duration")
                .description("Blockchain dispatch duration")
                .tags(
                        "event_type", eventType,
                        "dispatch_mode", dispatchMode,
                        "result", result,
                        "error_code", errorCode
                )
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 실제 ledger write 결과와 시간을 시도 횟수와 함께 기록한다.
    public void recordWrite(long durationNanos, String eventType, String attempt, String result, String errorCode) {
        Counter.builder("srank.blockchain.write.total")
                .description("Blockchain ledger write outcomes")
                .tags(
                        "event_type", eventType,
                        "attempt", attempt,
                        "result", result,
                        "error_code", errorCode
                )
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.blockchain.write.duration")
                .description("Blockchain ledger write duration")
                .tags(
                        "event_type", eventType,
                        "attempt", attempt,
                        "result", result,
                        "error_code", errorCode
                )
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 재시도 발생 여부를 event_type과 attempt 기준으로 기록한다.
    public void recordRetry(String eventType, String attempt, String result) {
        Counter.builder("srank.blockchain.retry.total")
                .description("Blockchain request retries")
                .tags("event_type", eventType, "attempt", attempt, "result", result)
                .register(meterRegistry)
                .increment();
    }
}
