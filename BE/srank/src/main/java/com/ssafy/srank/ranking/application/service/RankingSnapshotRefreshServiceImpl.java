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

    // 초기 요구사항 기준 상위 10개만 스냅샷으로 유지한다.
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

        // 배치 실행 시점의 랭킹만 남기기 위해 이전 스냅샷은 전량 교체한다.
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

        // 등급별 카드 랭킹도 동일하게 전체 교체 방식으로 관리한다.
        userCardGradeRankingSnapshotRepository.deleteAllInBatch();
        userCardGradeRankingSnapshotRepository.saveAll(snapshots);
    }

    @Override
    public void refreshCardStatTotalRankings() {
        LocalDateTime snapshotAt = LocalDateTime.now();
        List<CardStatTotalRankingSnapshot> snapshots = new ArrayList<>();
        int rank = 1;
        for (RankingAggregationRepository.CardStatTotalRankingAggregate aggregate :
                rankingAggregationRepository.findCardStatTotalRankings()) {
            snapshots.add(CardStatTotalRankingSnapshot.builder()
                    .rank(rank++)
                    .userId(aggregate.userId())
                    .nickname(aggregate.nickname())
                    .statTotal(aggregate.statTotal())
                    .achievedAt(aggregate.achievedAt())
                    .snapshotAt(snapshotAt)
                    .build());
        }

        // 카드 능력치 랭킹은 achievedAt 정렬 결과까지 스냅샷으로 고정한다.
        cardStatTotalRankingSnapshotRepository.deleteAllInBatch();
        cardStatTotalRankingSnapshotRepository.saveAll(snapshots);
    }
}
