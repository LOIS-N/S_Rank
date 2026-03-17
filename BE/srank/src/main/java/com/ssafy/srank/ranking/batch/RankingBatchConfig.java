package com.ssafy.srank.ranking.batch;

import com.ssafy.srank.ranking.application.service.RankingSnapshotRefreshService;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
@RequiredArgsConstructor
public class RankingBatchConfig {

    public static final String RANKING_SNAPSHOT_JOB = "rankingSnapshotJob";

    private final RankingSnapshotRefreshService rankingSnapshotRefreshService;

    @Bean
    public Job rankingSnapshotJob(JobRepository jobRepository,
                                  Step goldRankingStep,
                                  Step cardGradeCountRankingStep,
                                  Step cardStatTotalRankingStep) {
        return new JobBuilder(RANKING_SNAPSHOT_JOB, jobRepository)
                .start(goldRankingStep)
                .next(cardGradeCountRankingStep)
                .next(cardStatTotalRankingStep)
                .build();
    }

    @Bean
    public Step goldRankingStep(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return new StepBuilder("goldRankingStep", jobRepository)
                .tasklet((contribution, chunkContext) -> {
                    rankingSnapshotRefreshService.refreshGoldRankings();
                    return RepeatStatus.FINISHED;
                }, transactionManager)
                .build();
    }

    @Bean
    public Step cardGradeCountRankingStep(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return new StepBuilder("cardGradeCountRankingStep", jobRepository)
                .tasklet((contribution, chunkContext) -> {
                    rankingSnapshotRefreshService.refreshCardGradeCountRankings();
                    return RepeatStatus.FINISHED;
                }, transactionManager)
                .build();
    }

    @Bean
    public Step cardStatTotalRankingStep(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return new StepBuilder("cardStatTotalRankingStep", jobRepository)
                .tasklet((contribution, chunkContext) -> {
                    rankingSnapshotRefreshService.refreshCardStatTotalRankings();
                    return RepeatStatus.FINISHED;
                }, transactionManager)
                .build();
    }
}
