package com.ssafy.srank.ranking.application.service;

import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.RankingProjectionMetrics;
import com.ssafy.srank.ranking.repository.RankingAggregationRepository;
import com.ssafy.srank.ranking.repository.RankingRedisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class RankingProjectionServiceImpl implements RankingProjectionService {

    private final RankingRedisRepository rankingRedisRepository;
    private final RankingAggregationRepository rankingAggregationRepository;
    private final RankingSnapshotRefreshService rankingSnapshotRefreshService;
    private final RankingProjectionMetrics rankingProjectionMetrics;

    @Override
    public void applyGoldEarned(Long userId, long amount) {
        record("apply_gold_earned", () -> rankingRedisRepository.incrementGoldEarned(userId, amount));
    }

    @Override
    public void refreshUserCardGradeProjection(Long userId) {
        record("refresh_card_grade", () -> rankingAggregationRepository.findCardGradeCountRanking(userId)
                .ifPresent(aggregate -> rankingRedisRepository.saveCardGradeProjection(
                        aggregate.userId(),
                        aggregate.sCount(),
                        aggregate.aCount()
                )));
    }

    @Override
    public void refreshUserCardStatProjection(Long userId) {
        record("refresh_card_stat", () -> rankingAggregationRepository.findCardStatTotalRanking(userId)
                .ifPresent(aggregate -> rankingRedisRepository.saveCardStatProjection(
                        aggregate.userId(),
                        aggregate.statTotal(),
                        aggregate.achievedAt().toInstant(ZoneOffset.UTC).toEpochMilli(),
                        aggregate.representativeCardId()
                )));
    }

    @Override
    public void removeUserProjection(Long userId) {
        record("remove_user_projection", () -> rankingRedisRepository.deleteUserProjection(userId));
    }

    @Override
    public void rebuildAllRankings() {
        record("rebuild_all_rankings", () -> {
            rankingSnapshotRefreshService.refreshGoldRankings();
            rankingSnapshotRefreshService.refreshCardGradeCountRankings();
            rankingSnapshotRefreshService.refreshCardStatTotalRankings();
        });
    }

    // 랭킹 투영은 이벤트성 비동기 작업이라 서비스 진입점 기준으로만 측정한다.
    private void record(String operation, Runnable runnable) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            runnable.run();
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            rankingProjectionMetrics.recordOperation(System.nanoTime() - startNanos, operation, result, errorCode);
        }
    }
}
