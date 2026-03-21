package com.ssafy.srank.ranking.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.ranking.application.dto.response.CardGradeCountRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.CardStatTotalRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.GoldRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.RankingResponse;
import com.ssafy.srank.ranking.repository.CardStatTotalRankingSnapshotRepository;
import com.ssafy.srank.ranking.repository.UserCardGradeRankingSnapshotRepository;
import com.ssafy.srank.ranking.repository.UserGoldRankingSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RankingQueryServiceImpl implements RankingQueryService {

    private final UserGoldRankingSnapshotRepository userGoldRankingSnapshotRepository;
    private final UserCardGradeRankingSnapshotRepository userCardGradeRankingSnapshotRepository;
    private final CardStatTotalRankingSnapshotRepository cardStatTotalRankingSnapshotRepository;

    @Override
    public RankingResponse<GoldRankingItemResponse> getGoldRankings(Long userId) {
        List<GoldRankingItemResponse> topRankings = userGoldRankingSnapshotRepository.findTop10ByOrderByRankAsc().stream()
                .map(snapshot -> new GoldRankingItemResponse(
                        snapshot.getRank(),
                        snapshot.getNickname(),
                        snapshot.getGold()
                ))
                .toList();

        GoldRankingItemResponse myRanking = userGoldRankingSnapshotRepository.findByUserId(userId)
                .map(snapshot -> new GoldRankingItemResponse(
                        snapshot.getRank(),
                        snapshot.getNickname(),
                        snapshot.getGold()
                ))
                .orElseThrow(() -> new BusinessException(ErrorCode.RANKING_NOT_FOUND));

        return new RankingResponse<>(topRankings, myRanking);
    }

    @Override
    public RankingResponse<CardGradeCountRankingItemResponse> getCardGradeCountRankings(Long userId) {
        List<CardGradeCountRankingItemResponse> topRankings = userCardGradeRankingSnapshotRepository.findTop10ByOrderByRankAsc().stream()
                .map(snapshot -> new CardGradeCountRankingItemResponse(
                        snapshot.getRank(),
                        snapshot.getNickname(),
                        snapshot.getSCount(),
                        snapshot.getACount()
                ))
                .toList();

        CardGradeCountRankingItemResponse myRanking = userCardGradeRankingSnapshotRepository.findByUserId(userId)
                .map(snapshot -> new CardGradeCountRankingItemResponse(
                        snapshot.getRank(),
                        snapshot.getNickname(),
                        snapshot.getSCount(),
                        snapshot.getACount()
                ))
                .orElseThrow(() -> new BusinessException(ErrorCode.RANKING_NOT_FOUND));

        return new RankingResponse<>(topRankings, myRanking);
    }

    @Override
    public RankingResponse<CardStatTotalRankingItemResponse> getCardStatTotalRankings(Long userId) {
        List<CardStatTotalRankingItemResponse> topRankings = cardStatTotalRankingSnapshotRepository.findTop10ByOrderByRankAsc().stream()
                .map(snapshot -> new CardStatTotalRankingItemResponse(
                        snapshot.getRank(),
                        snapshot.getNickname(),
                        snapshot.getStatTotal()
                ))
                .toList();

        CardStatTotalRankingItemResponse myRanking = cardStatTotalRankingSnapshotRepository.findByUserId(userId)
                .map(snapshot -> new CardStatTotalRankingItemResponse(
                        snapshot.getRank(),
                        snapshot.getNickname(),
                        snapshot.getStatTotal()
                ))
                .orElseThrow(() -> new BusinessException(ErrorCode.RANKING_NOT_FOUND));

        return new RankingResponse<>(topRankings, myRanking);
    }
}
