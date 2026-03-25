package com.ssafy.srank.ranking.application.service;

public interface RankingProjectionService {

    void applyGoldEarned(Long userId, long amount);

    void refreshUserCardGradeProjection(Long userId);

    void refreshUserCardStatProjection(Long userId);

    void removeUserProjection(Long userId);

    void rebuildAllRankings();
}
