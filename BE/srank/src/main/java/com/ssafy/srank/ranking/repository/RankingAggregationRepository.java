package com.ssafy.srank.ranking.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RankingAggregationRepository {

    List<GoldRankingAggregate> findGoldRankings();

    List<CardGradeCountRankingAggregate> findCardGradeCountRankings();

    Optional<CardGradeCountRankingAggregate> findCardGradeCountRanking(Long userId);

    List<CardStatTotalRankingAggregate> findCardStatTotalRankings();

    Optional<CardStatTotalRankingAggregate> findCardStatTotalRanking(Long userId);

    record GoldRankingAggregate(
            Long userId,
            String nickname,
            long gold
    ) {
    }

    record CardGradeCountRankingAggregate(
            Long userId,
            String nickname,
            long sCount,
            long aCount
    ) {
    }

    record CardStatTotalRankingAggregate(
            Long userId,
            String nickname,
            int statTotal,
            LocalDateTime achievedAt,
            Long representativeCardId
    ) {
    }
}
