package com.ssafy.srank.ranking.batch;

import com.ssafy.srank.ranking.application.service.RankingSnapshotRefreshService;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
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
                                  Step cardStatTotalRankingStep,
                                  RankingBatchMetrics rankingBatchMetrics) {
        // 배치 전체 계측 연결을 이곳에 모아 두면 job 흐름을 따라가기가 쉽다.
        return new JobBuilder(RANKING_SNAPSHOT_JOB, jobRepository)
                .listener(rankingBatchMetrics.jobExecutionListener())
                .start(goldRankingStep)
                .next(cardGradeCountRankingStep)
                .next(cardStatTotalRankingStep)
                .build();
    }

    @Bean
    public Step goldRankingStep(JobRepository jobRepository,
                                PlatformTransactionManager transactionManager,
                                RankingBatchMetrics rankingBatchMetrics) {
        return new StepBuilder("goldRankingStep", jobRepository)
                .tasklet((contribution, chunkContext) -> {
                    // 세부 리소스 분해는 service 계층에서 처리한다.
                    rankingSnapshotRefreshService.refreshGoldRankings();
                    return RepeatStatus.FINISHED;
                }, transactionManager)
                .listener(rankingBatchMetrics.stepExecutionListener())
                .build();
    }

    @Bean
    public Step cardGradeCountRankingStep(JobRepository jobRepository,
                                          PlatformTransactionManager transactionManager,
                                          RankingBatchMetrics rankingBatchMetrics) {
        return new StepBuilder("cardGradeCountRankingStep", jobRepository)
                .tasklet((contribution, chunkContext) -> {
                    rankingSnapshotRefreshService.refreshCardGradeCountRankings();
                    return RepeatStatus.FINISHED;
                }, transactionManager)
                .listener(rankingBatchMetrics.stepExecutionListener())
                .build();
    }

    @Bean
    public Step cardStatTotalRankingStep(JobRepository jobRepository,
                                         PlatformTransactionManager transactionManager,
                                         RankingBatchMetrics rankingBatchMetrics) {
        return new StepBuilder("cardStatTotalRankingStep", jobRepository)
                .tasklet((contribution, chunkContext) -> {
                    // 이 step이 가장 무거운 경우가 많아서 시간을 분리해서 본다.
                    rankingSnapshotRefreshService.refreshCardStatTotalRankings();
                    return RepeatStatus.FINISHED;
                }, transactionManager)
                .listener(rankingBatchMetrics.stepExecutionListener())
                .build();
    }
}
