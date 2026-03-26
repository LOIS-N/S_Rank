package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 강화 시도 결과와 골드 소모량을 기록한다.
public class EnhancementMetrics {

    private final MeterRegistry meterRegistry;

    // 강화 시도 결과와 소요 시간을 등급 기준으로 기록한다.
    public void recordAttempt(long durationNanos, String grade, String result, String errorCode) {
        Counter.builder("srank.enhancement.attempt.total")
                .description("Enhancement attempt outcomes")
                .tags("grade", grade, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.enhancement.duration")
                .description("Enhancement attempt duration")
                .tags("grade", grade, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 강화에 사용된 골드 총량을 등급 기준으로 누적 기록한다.
    public void recordGoldSpent(String grade, long amount) {
        Counter.builder("srank.enhancement.gold.spent.total")
                .description("Total gold spent on enhancement")
                .baseUnit("gold")
                .tags("grade", grade)
                .register(meterRegistry)
                .increment(amount);
    }
}
