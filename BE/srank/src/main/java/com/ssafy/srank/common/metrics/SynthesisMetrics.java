package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 합성 시도 결과와 lock conflict를 기록한다.
public class SynthesisMetrics {

    private final MeterRegistry meterRegistry;

    // 합성 시도 결과와 시간을 재료 등급과 카드 수 기준으로 기록한다.
    public void recordAttempt(long durationNanos, String sourceGrade, String cardCount, String result, String errorCode) {
        Counter.builder("srank.synthesis.attempt.total")
                .description("Synthesis attempt outcomes")
                .tags("source_grade", sourceGrade, "card_count", cardCount, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.synthesis.duration")
                .description("Synthesis attempt duration")
                .tags("source_grade", sourceGrade, "card_count", cardCount, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 합성 중 발생한 lock conflict를 재료 등급 기준으로 기록한다.
    public void recordLockConflict(String sourceGrade) {
        Counter.builder("srank.synthesis.lock.conflict.total")
                .description("Synthesis lock conflict count")
                .tags("source_grade", sourceGrade)
                .register(meterRegistry)
                .increment();
    }
}
