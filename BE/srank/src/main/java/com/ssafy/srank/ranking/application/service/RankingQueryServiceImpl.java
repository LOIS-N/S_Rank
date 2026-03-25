package com.ssafy.srank.ranking.application.service;

import com.ssafy.srank.ranking.application.dto.response.CardGradeCountRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.CardStatTotalRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.GoldRankingItemResponse;
import com.ssafy.srank.ranking.application.dto.response.RankingResponse;
import com.ssafy.srank.ranking.repository.RankingRedisRepository;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RankingQueryServiceImpl implements RankingQueryService {

    private static final int UNRANKED_RANK = 9999;
    private static final String UNRANKED_NICKNAME = "미등록";
    private static final int TOP_LIMIT = 10;

    private final RankingRedisRepository rankingRedisRepository;
    private final UserRepository userRepository;

    @Override
    public RankingResponse<GoldRankingItemResponse> getGoldRankings(Long userId) {
        String buildId = rankingRedisRepository.getCurrentGoldBuildId();
        List<RankingRedisRepository.GoldProjection> topProjections = rankingRedisRepository.findTopGoldEarned(buildId, TOP_LIMIT);
        Map<Long, String> nicknames = resolveNicknames(topProjections.stream().map(RankingRedisRepository.GoldProjection::userId).toList());
        List<GoldRankingItemResponse> topRankings = toGoldResponses(topProjections, nicknames);

        GoldRankingItemResponse myRanking = rankingRedisRepository.findGoldProjection(buildId, userId)
                .flatMap(projection -> {
                    Long rank = rankingRedisRepository.findGoldRank(buildId, userId);
                    if (rank == null) {
                        return java.util.Optional.empty();
                    }
                    return java.util.Optional.of(new GoldRankingItemResponse(
                            rank.intValue(),
                            nicknames.getOrDefault(userId, resolveNickname(userId)),
                            projection.amount()
                    ));
                })
                .orElseGet(this::createUnrankedGoldRanking);

        return new RankingResponse<>(topRankings, myRanking);
    }

    @Override
    public RankingResponse<CardGradeCountRankingItemResponse> getCardGradeCountRankings(Long userId) {
        String buildId = rankingRedisRepository.getCurrentCardGradeBuildId();
        List<RankingRedisRepository.CardGradeProjection> topProjections = rankingRedisRepository.findTopCardGradeProjections(buildId, TOP_LIMIT);
        Map<Long, String> nicknames = resolveNicknames(topProjections.stream().map(RankingRedisRepository.CardGradeProjection::userId).toList());
        List<CardGradeCountRankingItemResponse> topRankings = toCardGradeResponses(topProjections, nicknames);

        CardGradeCountRankingItemResponse myRanking = rankingRedisRepository.findCardGradeProjection(buildId, userId)
                .flatMap(projection -> {
                    Long rank = rankingRedisRepository.findCardGradeRank(buildId, userId);
                    if (rank == null) {
                        return java.util.Optional.empty();
                    }
                    return java.util.Optional.of(new CardGradeCountRankingItemResponse(
                            rank.intValue(),
                            nicknames.getOrDefault(userId, resolveNickname(userId)),
                            projection.sCount(),
                            projection.aCount()
                    ));
                })
                .orElseGet(this::createUnrankedCardGradeCountRanking);

        return new RankingResponse<>(topRankings, myRanking);
    }

    @Override
    public RankingResponse<CardStatTotalRankingItemResponse> getCardStatTotalRankings(Long userId) {
        String buildId = rankingRedisRepository.getCurrentCardStatBuildId();
        List<RankingRedisRepository.CardStatProjection> topProjections = rankingRedisRepository.findTopCardStatProjections(buildId, TOP_LIMIT);
        Map<Long, String> nicknames = resolveNicknames(topProjections.stream().map(RankingRedisRepository.CardStatProjection::userId).toList());
        List<CardStatTotalRankingItemResponse> topRankings = toCardStatResponses(topProjections, nicknames);

        CardStatTotalRankingItemResponse myRanking = rankingRedisRepository.findCardStatProjection(buildId, userId)
                .flatMap(projection -> {
                    Long rank = rankingRedisRepository.findCardStatRank(buildId, userId);
                    if (rank == null) {
                        return java.util.Optional.empty();
                    }
                    return java.util.Optional.of(new CardStatTotalRankingItemResponse(
                            rank.intValue(),
                            nicknames.getOrDefault(userId, resolveNickname(userId)),
                            projection.statTotal()
                    ));
                })
                .orElseGet(this::createUnrankedCardStatTotalRanking);

        return new RankingResponse<>(topRankings, myRanking);
    }

    private List<GoldRankingItemResponse> toGoldResponses(
            List<RankingRedisRepository.GoldProjection> projections,
            Map<Long, String> nicknames
    ) {
        return java.util.stream.IntStream.range(0, projections.size())
                .mapToObj(index -> {
                    RankingRedisRepository.GoldProjection projection = projections.get(index);
                    return new GoldRankingItemResponse(
                            index + 1,
                            nicknames.get(projection.userId()),
                            projection.amount()
                    );
                })
                .toList();
    }

    private List<CardGradeCountRankingItemResponse> toCardGradeResponses(
            List<RankingRedisRepository.CardGradeProjection> projections,
            Map<Long, String> nicknames
    ) {
        return java.util.stream.IntStream.range(0, projections.size())
                .mapToObj(index -> {
                    RankingRedisRepository.CardGradeProjection projection = projections.get(index);
                    return new CardGradeCountRankingItemResponse(
                            index + 1,
                            nicknames.get(projection.userId()),
                            projection.sCount(),
                            projection.aCount()
                    );
                })
                .toList();
    }

    private List<CardStatTotalRankingItemResponse> toCardStatResponses(
            List<RankingRedisRepository.CardStatProjection> projections,
            Map<Long, String> nicknames
    ) {
        return java.util.stream.IntStream.range(0, projections.size())
                .mapToObj(index -> {
                    RankingRedisRepository.CardStatProjection projection = projections.get(index);
                    return new CardStatTotalRankingItemResponse(
                            index + 1,
                            nicknames.get(projection.userId()),
                            projection.statTotal()
                    );
                })
                .toList();
    }

    private Map<Long, String> resolveNicknames(List<Long> userIds) {
        Map<Long, String> nicknames = new HashMap<>();
        for (User user : userRepository.findAllById(userIds)) {
            nicknames.put(user.getUserId(), user.getNickname());
        }
        return nicknames;
    }

    private String resolveNickname(Long userId) {
        return userRepository.findById(userId)
                .map(User::getNickname)
                .orElse(UNRANKED_NICKNAME);
    }

    private GoldRankingItemResponse createUnrankedGoldRanking() {
        return new GoldRankingItemResponse(UNRANKED_RANK, UNRANKED_NICKNAME, 0L);
    }

    private CardGradeCountRankingItemResponse createUnrankedCardGradeCountRanking() {
        return new CardGradeCountRankingItemResponse(UNRANKED_RANK, UNRANKED_NICKNAME, 0L, 0L);
    }

    private CardStatTotalRankingItemResponse createUnrankedCardStatTotalRanking() {
        return new CardStatTotalRankingItemResponse(UNRANKED_RANK, UNRANKED_NICKNAME, 0);
    }
}
