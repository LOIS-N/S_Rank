package com.ssafy.srank.ranking.application.service;

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

    public static final int TOP_LIMIT = 10;

    private final RankingAggregationRepository rankingAggregationRepository;
    private final UserGoldRankingSnapshotRepository userGoldRankingSnapshotRepository;
    private final UserCardGradeRankingSnapshotRepository userCardGradeRankingSnapshotRepository;
    private final CardStatTotalRankingSnapshotRepository cardStatTotalRankingSnapshotRepository;

    @Override
    public void refreshGoldRankings() {
        LocalDateTime snapshotAt = LocalDateTime.now();
        List<UserGoldRankingSnapshot> snapshots = new ArrayList<>();
        int rank = 1;
        for (RankingAggregationRepository.GoldRankingAggregate aggregate :
                rankingAggregationRepository.findTopGoldRankings(TOP_LIMIT)) {
            snapshots.add(UserGoldRankingSnapshot.builder()
                    .rank(rank++)
                    .userId(aggregate.userId())
                    .nickname(aggregate.nickname())
                    .gold(aggregate.gold())
                    .snapshotAt(snapshotAt)
                    .build());
        }

        userGoldRankingSnapshotRepository.deleteAllInBatch();
        userGoldRankingSnapshotRepository.saveAll(snapshots);
    }

    @Override
    public void refreshCardGradeCountRankings() {
        LocalDateTime snapshotAt = LocalDateTime.now();
        List<UserCardGradeRankingSnapshot> snapshots = new ArrayList<>();
        int rank = 1;
        for (RankingAggregationRepository.CardGradeCountRankingAggregate aggregate :
                rankingAggregationRepository.findTopCardGradeCountRankings(TOP_LIMIT)) {
            snapshots.add(UserCardGradeRankingSnapshot.builder()
                    .rank(rank++)
                    .userId(aggregate.userId())
                    .nickname(aggregate.nickname())
                    .sCount(aggregate.sCount())
                    .aCount(aggregate.aCount())
                    .snapshotAt(snapshotAt)
                    .build());
        }

        userCardGradeRankingSnapshotRepository.deleteAllInBatch();
        userCardGradeRankingSnapshotRepository.saveAll(snapshots);
    }

    @Override
    public void refreshCardStatTotalRankings() {
        LocalDateTime snapshotAt = LocalDateTime.now();
        List<CardStatTotalRankingSnapshot> snapshots = new ArrayList<>();
        int rank = 1;
        for (RankingAggregationRepository.CardStatTotalRankingAggregate aggregate :
                rankingAggregationRepository.findTopCardStatTotalRankings(TOP_LIMIT)) {
            snapshots.add(CardStatTotalRankingSnapshot.builder()
                    .rank(rank++)
                    .userCardId(aggregate.userCardId())
                    .cardName(aggregate.cardName())
                    .statTotal(aggregate.statTotal())
                    .achievedAt(aggregate.achievedAt())
                    .snapshotAt(snapshotAt)
                    .build());
        }

        cardStatTotalRankingSnapshotRepository.deleteAllInBatch();
        cardStatTotalRankingSnapshotRepository.saveAll(snapshots);
    }
}
