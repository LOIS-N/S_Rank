package com.ssafy.srank.ranking.application.service;

import com.ssafy.srank.ranking.batch.RankingBatchMetrics;
import com.ssafy.srank.ranking.domain.entity.CardStatTotalRankingSnapshot;
import com.ssafy.srank.ranking.domain.entity.UserCardGradeRankingSnapshot;
import com.ssafy.srank.ranking.domain.entity.UserGoldRankingSnapshot;
import com.ssafy.srank.ranking.repository.CardStatTotalRankingSnapshotRepository;
import com.ssafy.srank.ranking.repository.RankingAggregationRepository;
import com.ssafy.srank.ranking.repository.UserCardGradeRankingSnapshotRepository;
import com.ssafy.srank.ranking.repository.UserGoldRankingSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class RankingSnapshotRefreshServiceImpl implements RankingSnapshotRefreshService {

    private static final String GOLD = "gold";
    private static final String CARD_GRADE_COUNT = "card_grade_count";
    private static final String CARD_STAT_TOTAL = "card_stat_total";

    private final RankingAggregationRepository rankingAggregationRepository;
    private final UserGoldRankingSnapshotRepository userGoldRankingSnapshotRepository;
    private final UserCardGradeRankingSnapshotRepository userCardGradeRankingSnapshotRepository;
    private final CardStatTotalRankingSnapshotRepository cardStatTotalRankingSnapshotRepository;
    private final RankingBatchMetrics rankingBatchMetrics;

    @Override
    public void refreshGoldRankings() {
        LocalDateTime snapshotAt = LocalDateTime.now();
        List<UserGoldRankingSnapshot> snapshots = new ArrayList<>();
        int rank = 1;

        // query/delete/save를 나눠 재야 느린 지점을 Prometheus에서 바로 볼 수 있다.
        List<RankingAggregationRepository.GoldRankingAggregate> aggregates =
                rankingBatchMetrics.recordPhase(GOLD, "query", rankingAggregationRepository::findGoldRankings);

        for (RankingAggregationRepository.GoldRankingAggregate aggregate : aggregates) {
            snapshots.add(UserGoldRankingSnapshot.builder()
                    .rank(rank++)
                    .userId(aggregate.userId())
                    .nickname(aggregate.nickname())
                    .gold(aggregate.gold())
                    .snapshotAt(snapshotAt)
                    .build());
        }

        rankingBatchMetrics.recordSnapshotSize(GOLD, snapshots.size());
        rankingBatchMetrics.recordPhaseAction(GOLD, "delete", userGoldRankingSnapshotRepository::deleteAllInBatch);
        rankingBatchMetrics.recordPhase(GOLD, "save", () -> userGoldRankingSnapshotRepository.saveAll(snapshots));
    }

    @Override
    public void refreshCardGradeCountRankings() {
        LocalDateTime snapshotAt = LocalDateTime.now();
        List<UserCardGradeRankingSnapshot> snapshots = new ArrayList<>();
        int rank = 1;

        List<RankingAggregationRepository.CardGradeCountRankingAggregate> aggregates =
                rankingBatchMetrics.recordPhase(CARD_GRADE_COUNT, "query",
                        rankingAggregationRepository::findCardGradeCountRankings);

        for (RankingAggregationRepository.CardGradeCountRankingAggregate aggregate : aggregates) {
            snapshots.add(UserCardGradeRankingSnapshot.builder()
                    .rank(rank++)
                    .userId(aggregate.userId())
                    .nickname(aggregate.nickname())
                    .sCount(aggregate.sCount())
                    .aCount(aggregate.aCount())
                    .snapshotAt(snapshotAt)
                    .build());
        }

        rankingBatchMetrics.recordSnapshotSize(CARD_GRADE_COUNT, snapshots.size());
        rankingBatchMetrics.recordPhaseAction(CARD_GRADE_COUNT, "delete",
                userCardGradeRankingSnapshotRepository::deleteAllInBatch);
        rankingBatchMetrics.recordPhase(CARD_GRADE_COUNT, "save",
                () -> userCardGradeRankingSnapshotRepository.saveAll(snapshots));
    }

    @Override
    public void refreshCardStatTotalRankings() {
        LocalDateTime snapshotAt = LocalDateTime.now();
        List<CardStatTotalRankingSnapshot> snapshots = new ArrayList<>();
        int rank = 1;

        List<RankingAggregationRepository.CardStatTotalRankingAggregate> aggregates =
                rankingBatchMetrics.recordPhase(CARD_STAT_TOTAL, "query",
                        rankingAggregationRepository::findCardStatTotalRankings);

        for (RankingAggregationRepository.CardStatTotalRankingAggregate aggregate : aggregates) {
            snapshots.add(CardStatTotalRankingSnapshot.builder()
                    .rank(rank++)
                    .userId(aggregate.userId())
                    .nickname(aggregate.nickname())
                    .statTotal(aggregate.statTotal())
                    .achievedAt(aggregate.achievedAt())
                    .snapshotAt(snapshotAt)
                    .build());
        }

        rankingBatchMetrics.recordSnapshotSize(CARD_STAT_TOTAL, snapshots.size());
        rankingBatchMetrics.recordPhaseAction(CARD_STAT_TOTAL, "delete",
                cardStatTotalRankingSnapshotRepository::deleteAllInBatch);
        rankingBatchMetrics.recordPhase(CARD_STAT_TOTAL, "save",
                () -> cardStatTotalRankingSnapshotRepository.saveAll(snapshots));
    }
}
