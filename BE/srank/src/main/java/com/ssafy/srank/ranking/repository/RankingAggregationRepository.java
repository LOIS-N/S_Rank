package com.ssafy.srank.ranking.repository;

import java.time.LocalDateTime;
import java.util.List;

public interface RankingAggregationRepository {

    List<GoldRankingAggregate> findGoldRankings();

    List<CardGradeCountRankingAggregate> findCardGradeCountRankings();

    List<CardStatTotalRankingAggregate> findCardStatTotalRankings();

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
            LocalDateTime achievedAt
    ) {
    }
}
