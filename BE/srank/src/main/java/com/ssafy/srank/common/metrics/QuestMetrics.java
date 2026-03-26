package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 퀘스트 진행, 보상, 스케줄링 흐름을 기록한다.
public class QuestMetrics {

    private final MeterRegistry meterRegistry;

    // 퀘스트 시작 결과와 시간을 quest_type 기준으로 기록한다.
    public void recordStart(long durationNanos, String questType, String result, String errorCode) {
        Counter.builder("srank.quest.start.total")
                .description("Quest start outcomes")
                .tags("quest_type", questType, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        recordQuestDuration(durationNanos, "start", questType, result, errorCode);
    }

    // 퀘스트 완료 결과와 시간을 quest_type 기준으로 기록한다.
    public void recordComplete(long durationNanos, String questType, String result, String errorCode) {
        Counter.builder("srank.quest.complete.total")
                .description("Quest completion outcomes")
                .tags("quest_type", questType, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        recordQuestDuration(durationNanos, "complete", questType, result, errorCode);
    }

    // 퀘스트 보상 수령 결과와 시간을 quest_type 기준으로 기록한다.
    public void recordRewardClaim(long durationNanos, String questType, String result, String errorCode) {
        Counter.builder("srank.quest.reward.claim.total")
                .description("Quest reward claim outcomes")
                .tags("quest_type", questType, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        recordQuestDuration(durationNanos, "reward_claim", questType, result, errorCode);
    }

    // Redis 만료 이벤트 처리 결과를 기록한다.
    public void recordExpirationEvent(String result) {
        Counter.builder("srank.quest.expiration.event.total")
                .description("Redis quest expiration event outcomes")
                .tags("result", result)
                .register(meterRegistry)
                .increment();
    }

    // OpenAI 호출 결과와 시간을 operation, model, difficulty 기준으로 기록한다.
    public void recordOpenAiRequest(long durationNanos, String operation, String model, String difficulty, String result) {
        Counter.builder("srank.openai.request.total")
                .description("OpenAI request outcomes for quest generation")
                .tags("operation", operation, "model", model, "difficulty", difficulty, "result", result)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.openai.request.duration")
                .description("OpenAI request duration for quest generation")
                .tags("operation", operation, "model", model, "difficulty", difficulty, "result", result)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 서브퀘스트 스케줄러 실행 결과와 시간을 trigger 기준으로 기록한다.
    public void recordSchedulerRun(long durationNanos, String trigger, String result) {
        Counter.builder("srank.subquest.scheduler.run.total")
                .description("Subquest scheduler run outcomes")
                .tags("trigger", trigger, "result", result)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.subquest.scheduler.duration")
                .description("Subquest scheduler duration")
                .tags("trigger", trigger, "result", result)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 난이도별 저장된 서브퀘스트 수를 누적 기록한다.
    public void recordSavedSubquests(String difficulty, int savedCount) {
        Counter.builder("srank.subquest.scheduler.saved.total")
                .description("Total saved subquests by difficulty")
                .baseUnit("quests")
                .tags("difficulty", difficulty)
                .register(meterRegistry)
                .increment(savedCount);
    }

    // 난이도별 OpenAI 파싱 실패 횟수를 기록한다.
    public void recordParseFailure(String difficulty) {
        Counter.builder("srank.subquest.parse.failure.total")
                .description("OpenAI subquest parse failures by difficulty")
                .tags("difficulty", difficulty)
                .register(meterRegistry)
                .increment();
    }

    // 퀘스트 공통 duration 타이머를 operation 기준으로 기록한다.
    private void recordQuestDuration(long durationNanos, String operation, String questType, String result, String errorCode) {
        Timer.builder("srank.quest.duration")
                .description("Quest operation duration")
                .tags("operation", operation, "quest_type", questType, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }
}
