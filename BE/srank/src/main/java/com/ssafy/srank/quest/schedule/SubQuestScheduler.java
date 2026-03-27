package com.ssafy.srank.quest.schedule;

import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.QuestMetrics;
import com.ssafy.srank.quest.application.service.SubQuestScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubQuestScheduler {

    private final SubQuestScheduleService subQuestScheduleService;
    private final QuestMetrics questMetrics;

    @Scheduled(cron = "0 0 0 * * *")
    public void generateDailySubQuests() {
        long startNanos = System.nanoTime();
        boolean hasFailure = false;
        log.info("sub quest daily generation started");

        for (int difficulty = 1; difficulty <= 6; difficulty++) {
            try {
                subQuestScheduleService.generateAndSave(difficulty);
            } catch (Exception e) {
                hasFailure = true;
                log.error("sub quest generation failed difficulty={}", difficulty, e);
            }
        }

        questMetrics.recordSchedulerRun(
                System.nanoTime() - startNanos,
                "scheduled",
                hasFailure ? MetricTagValues.RESULT_PARTIAL_FAILURE : MetricTagValues.RESULT_SUCCESS
        );
        log.info("sub quest daily generation completed");
    }
}
