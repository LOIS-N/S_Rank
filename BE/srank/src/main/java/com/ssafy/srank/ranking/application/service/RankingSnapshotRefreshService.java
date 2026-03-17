package com.ssafy.srank.ranking.application.service;

public interface RankingSnapshotRefreshService {

    void refreshGoldRankings();

    void refreshCardGradeCountRankings();

    void refreshCardStatTotalRankings();
}
