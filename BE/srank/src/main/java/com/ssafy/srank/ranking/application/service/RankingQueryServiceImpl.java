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
        // 조회 API는 실시간 집계가 아니라 배치가 저장한 스냅샷만 읽는다.
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
        // 응답 필드명은 API 명세에 맞추고, 내부 저장 구조는 스냅샷 엔티티를 그대로 사용한다.
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
        // 카드 능력치 랭킹은 achievedAt까지 스냅샷에 저장하지만 조회 응답에는 노출하지 않는다.
        return cardStatTotalRankingSnapshotRepository.findAllByOrderByRankAsc().stream()
                .map(snapshot -> new CardStatTotalRankingItemResponse(
                        snapshot.getRank(),
                        snapshot.getCardName(),
                        snapshot.getStatTotal()
                ))
                .toList();
    }
}
