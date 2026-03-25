package com.ssafy.srank.ranking.application.service;

import com.ssafy.srank.ranking.batch.RankingBatchMetrics;
import com.ssafy.srank.ranking.repository.RankingAggregationRepository;
import com.ssafy.srank.ranking.repository.RankingRedisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class RankingSnapshotRefreshServiceImpl implements RankingSnapshotRefreshService {

    private static final String GOLD = "gold";
    private static final String CARD_GRADE_COUNT = "card_grade_count";
    private static final String CARD_STAT_TOTAL = "card_stat_total";

    private final RankingAggregationRepository rankingAggregationRepository;
    private final RankingRedisRepository rankingRedisRepository;
    private final RankingBatchMetrics rankingBatchMetrics;

    @Override
    public void refreshGoldRankings() {
        List<RankingAggregationRepository.GoldRankingAggregate> aggregates =
                rankingBatchMetrics.recordPhase(GOLD, "query", rankingAggregationRepository::findGoldRankings);
        rankingBatchMetrics.recordSnapshotSize(GOLD, aggregates.size());
        rankingBatchMetrics.recordPhaseAction(GOLD, "replace", () -> rankingRedisRepository.replaceGoldRankings(aggregates));
    }

    @Override
    public void refreshCardGradeCountRankings() {
        List<RankingAggregationRepository.CardGradeCountRankingAggregate> aggregates =
                rankingBatchMetrics.recordPhase(CARD_GRADE_COUNT, "query",
                        rankingAggregationRepository::findCardGradeCountRankings);
        rankingBatchMetrics.recordSnapshotSize(CARD_GRADE_COUNT, aggregates.size());
        rankingBatchMetrics.recordPhaseAction(CARD_GRADE_COUNT, "replace",
                () -> rankingRedisRepository.replaceCardGradeRankings(aggregates));
    }

    @Override
    public void refreshCardStatTotalRankings() {
        List<RankingAggregationRepository.CardStatTotalRankingAggregate> aggregates =
                rankingBatchMetrics.recordPhase(CARD_STAT_TOTAL, "query",
                        rankingAggregationRepository::findCardStatTotalRankings);
        rankingBatchMetrics.recordSnapshotSize(CARD_STAT_TOTAL, aggregates.size());
        rankingBatchMetrics.recordPhaseAction(CARD_STAT_TOTAL, "replace",
                () -> rankingRedisRepository.replaceCardStatRankings(aggregates));
    }
}
