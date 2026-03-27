package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 가챠 draw 결과와 소모 자원을 기록한다.
public class GachaMetrics {

    private final MeterRegistry meterRegistry;

    // 가챠 draw 결과와 소요 시간을 타입과 횟수 기준으로 기록한다.
    public void recordDraw(long durationNanos, String gachaType, String drawCount, String result, String errorCode) {
        Counter.builder("srank.gacha.draw.total")
                .description("Gacha draw outcomes")
                .tags("gacha_type", gachaType, "draw_count", drawCount, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.gacha.draw.duration")
                .description("Gacha draw duration")
                .tags("gacha_type", gachaType, "draw_count", drawCount, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 가챠에 사용된 골드 총량을 타입과 횟수 기준으로 누적 기록한다.
    public void recordGoldSpent(String gachaType, String drawCount, long amount) {
        Counter.builder("srank.gacha.gold.spent.total")
                .description("Total gold spent on gacha")
                .baseUnit("gold")
                .tags("gacha_type", gachaType, "draw_count", drawCount)
                .register(meterRegistry)
                .increment(amount);
    }

    // 가챠로 생성된 카드 수를 타입과 횟수 기준으로 누적 기록한다.
    public void recordCardsCreated(String gachaType, String drawCount, int count) {
        Counter.builder("srank.gacha.cards.created.total")
                .description("Total cards created by gacha")
                .baseUnit("cards")
                .tags("gacha_type", gachaType, "draw_count", drawCount)
                .register(meterRegistry)
                .increment(count);
    }
}
