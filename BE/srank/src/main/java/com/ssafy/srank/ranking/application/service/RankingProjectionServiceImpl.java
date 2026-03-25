package com.ssafy.srank.ranking.application.service;

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

    @Override
    public void applyGoldEarned(Long userId, long amount) {
        rankingRedisRepository.incrementGoldEarned(userId, amount);
    }

    @Override
    public void refreshUserCardGradeProjection(Long userId) {
        rankingAggregationRepository.findCardGradeCountRanking(userId)
                .ifPresent(aggregate -> rankingRedisRepository.saveCardGradeProjection(
                        aggregate.userId(),
                        aggregate.sCount(),
                        aggregate.aCount()
                ));
    }

    @Override
    public void refreshUserCardStatProjection(Long userId) {
        rankingAggregationRepository.findCardStatTotalRanking(userId)
                .ifPresent(aggregate -> rankingRedisRepository.saveCardStatProjection(
                        aggregate.userId(),
                        aggregate.statTotal(),
                        aggregate.achievedAt().toInstant(ZoneOffset.UTC).toEpochMilli(),
                        aggregate.representativeCardId()
                ));
    }

    @Override
    public void removeUserProjection(Long userId) {
        rankingRedisRepository.deleteUserProjection(userId);
    }

    @Override
    public void rebuildAllRankings() {
        rankingSnapshotRefreshService.refreshGoldRankings();
        rankingSnapshotRefreshService.refreshCardGradeCountRankings();
        rankingSnapshotRefreshService.refreshCardStatTotalRankings();
    }
}
