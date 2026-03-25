package com.ssafy.srank.ranking.repository;

import java.util.List;
import java.util.Optional;

public interface RankingRedisRepository {

    void incrementGoldEarned(Long userId, long amount);

    void saveCardGradeProjection(Long userId, long sCount, long aCount);

    void saveCardStatProjection(Long userId, int statTotal, long achievedAtEpochMillis, Long representativeCardId);

    void deleteUserProjection(Long userId);

    String getCurrentGoldBuildId();

    List<GoldProjection> findTopGoldEarned(String buildId, int limit);

    Long findGoldRank(String buildId, Long userId);

    Optional<GoldProjection> findGoldProjection(String buildId, Long userId);

    String getCurrentCardGradeBuildId();

    List<CardGradeProjection> findTopCardGradeProjections(String buildId, int limit);

    Long findCardGradeRank(String buildId, Long userId);

    Optional<CardGradeProjection> findCardGradeProjection(String buildId, Long userId);

    String getCurrentCardStatBuildId();

    List<CardStatProjection> findTopCardStatProjections(String buildId, int limit);

    Long findCardStatRank(String buildId, Long userId);

    Optional<CardStatProjection> findCardStatProjection(String buildId, Long userId);

    void replaceGoldRankings(List<RankingAggregationRepository.GoldRankingAggregate> aggregates);

    void replaceCardGradeRankings(List<RankingAggregationRepository.CardGradeCountRankingAggregate> aggregates);

    void replaceCardStatRankings(List<RankingAggregationRepository.CardStatTotalRankingAggregate> aggregates);

    record GoldProjection(
            Long userId,
            long amount
    ) {
    }

    record CardGradeProjection(
            Long userId,
            long sCount,
            long aCount
    ) {
    }

    record CardStatProjection(
            Long userId,
            int statTotal,
            long achievedAtEpochMillis,
            Long representativeCardId
    ) {
    }
}
