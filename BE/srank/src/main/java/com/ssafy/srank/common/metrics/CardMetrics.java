package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 카드 삭제 결과와 삭제된 카드 수를 기록한다.
public class CardMetrics {

    private final MeterRegistry meterRegistry;

    // 카드 삭제 요청의 결과와 소요 시간을 기록한다.
    public void recordDelete(long durationNanos, String result, String errorCode) {
        Counter.builder("srank.card.delete.total")
                .description("Card delete outcomes")
                .tags("result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.card.delete.duration")
                .description("Card delete duration")
                .tags("result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 실제로 삭제된 카드 수를 누적 기록한다.
    public void recordDeletedCards(int count) {
        Counter.builder("srank.card.deleted.total")
                .description("Cards deleted by users")
                .baseUnit("cards")
                .register(meterRegistry)
                .increment(count);
    }
}
