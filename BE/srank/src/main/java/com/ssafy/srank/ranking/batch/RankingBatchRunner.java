package com.ssafy.srank.ranking.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RankingBatchRunner {

    private final JobLauncher jobLauncher;
    private final Job rankingSnapshotJob;

    @Value("${app.ranking.batch.runner-enabled:true}")
    private boolean runnerEnabled;

    @Scheduled(cron = "0 0 * * * *")
    public void runScheduledJob() {
        if (!runnerEnabled) {
            return;
        }
        launch("scheduled");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void runOnStartup() {
        if (!runnerEnabled) {
            return;
        }
        launch("startup");
    }

    private void launch(String trigger) {
        try {
            JobParameters jobParameters = new JobParametersBuilder()
                    .addString("trigger", trigger)
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();

            jobLauncher.run(rankingSnapshotJob, jobParameters);
        } catch (Exception e) {
            log.error("랭킹 배치 실행 실패 - trigger={}", trigger, e);
        }
    }
}
