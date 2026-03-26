package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 랭킹 projection 갱신 작업의 결과와 시간을 기록한다.
public class RankingProjectionMetrics {

    private final MeterRegistry meterRegistry;

    // 랭킹 projection 작업의 결과와 시간을 operation 기준으로 기록한다.
    public void recordOperation(long durationNanos, String operation, String result, String errorCode) {
        Counter.builder("srank.ranking.projection.total")
                .description("Ranking projection operation outcomes")
                .tags("operation", operation, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.ranking.projection.duration")
                .description("Ranking projection operation duration")
                .tags("operation", operation, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }
}
