package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 사용자 정보 변경과 보상 지급 같은 user mutation 흐름을 기록한다.
public class UserMetrics {

    private final MeterRegistry meterRegistry;

    // 사용자 변경 작업의 결과와 시간을 operation 기준으로 기록한다.
    public void recordOperation(long durationNanos, String operation, String result, String errorCode) {
        Counter.builder("srank.user.operation.total")
                .description("User operation outcomes")
                .tags("operation", operation, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.user.operation.duration")
                .description("User operation duration")
                .tags("operation", operation, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 사용자 작업으로 지급된 골드 총량을 reason 기준으로 누적 기록한다.
    public void recordGoldReward(String reason, long amount) {
        Counter.builder("srank.user.gold.reward.total")
                .description("Gold rewarded through user operations")
                .baseUnit("gold")
                .tags("reason", reason)
                .register(meterRegistry)
                .increment(amount);
    }
}
