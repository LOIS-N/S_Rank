package com.ssafy.srank.ranking.repository;

import java.time.LocalDateTime;
import java.util.List;

public interface RankingAggregationRepository {

    List<GoldRankingAggregate> findTopGoldRankings(int limit);

    List<CardGradeCountRankingAggregate> findTopCardGradeCountRankings(int limit);

    List<CardStatTotalRankingAggregate> findTopCardStatTotalRankings(int limit);

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
            Long userCardId,
            String cardName,
            int statTotal,
            LocalDateTime achievedAt
    ) {
    }
}
