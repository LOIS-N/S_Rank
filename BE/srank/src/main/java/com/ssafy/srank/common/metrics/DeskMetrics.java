package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 책상 해금 결과와 소요 시간을 기록한다.
public class DeskMetrics {

    private final MeterRegistry meterRegistry;

    // 책상 해금 요청의 결과와 소요 시간을 desk_template_id 기준으로 기록한다.
    public void recordUnlock(long durationNanos, String deskTemplateId, String result, String errorCode) {
        Counter.builder("srank.desk.unlock.total")
                .description("Desk unlock outcomes")
                .tags("desk_template_id", deskTemplateId, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.desk.unlock.duration")
                .description("Desk unlock duration")
                .tags("desk_template_id", deskTemplateId, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }
}
