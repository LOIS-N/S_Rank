package com.ssafy.srank.ranking.application.service;

import com.ssafy.srank.ranking.application.dto.response.CardGradeCountRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.CardStatTotalRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.GoldRankingItemResponse;
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
    public List<GoldRankingItemResponse> getGoldRankings() {
        return userGoldRankingSnapshotRepository.findAllByOrderByRankAsc().stream()
                .map(snapshot -> new GoldRankingItemResponse(
                        snapshot.getRank(),
                        snapshot.getNickname(),
                        snapshot.getGold()
                ))
                .toList();
    }

    @Override
    public List<CardGradeCountRankingItemResponse> getCardGradeCountRankings() {
        return userCardGradeRankingSnapshotRepository.findAllByOrderByRankAsc().stream()
                .map(snapshot -> new CardGradeCountRankingItemResponse(
                        snapshot.getRank(),
                        snapshot.getNickname(),
                        snapshot.getSCount(),
                        snapshot.getACount()
                ))
                .toList();
    }

    @Override
    public List<CardStatTotalRankingItemResponse> getCardStatTotalRankings() {
        return cardStatTotalRankingSnapshotRepository.findAllByOrderByRankAsc().stream()
                .map(snapshot -> new CardStatTotalRankingItemResponse(
                        snapshot.getRank(),
                        snapshot.getCardName(),
                        snapshot.getStatTotal()
                ))
                .toList();
    }
}
