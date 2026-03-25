package com.ssafy.srank.ranking.repository;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations.TypedTuple;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Repository
public class RankingRedisRepositoryImpl implements RankingRedisRepository {

    private static final String KEY_PREFIX = "ranking:v1";
    private static final String DEFAULT_BUILD = "live";
    private static final String GOLD_NAMESPACE = "gold-earned";
    private static final String CARD_GRADE_NAMESPACE = "card-grade";
    private static final String CARD_STAT_NAMESPACE = "card-stat";
    private static final long CARD_GRADE_SCORE_MULTIPLIER = 1_000_000L;

    private final StringRedisTemplate redisTemplate;

    private final Object goldMonitor = new Object();
    private final Object cardGradeMonitor = new Object();
    private final Object cardStatMonitor = new Object();

    public RankingRedisRepositoryImpl(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void incrementGoldEarned(Long userId, long amount) {
        synchronized (goldMonitor) {
            String buildId = currentBuildId(GOLD_NAMESPACE);
            String member = member(userId);
            String hashKey = userHashKey(buildId, GOLD_NAMESPACE, userId);

            long updatedAmount = Optional.ofNullable(redisTemplate.opsForHash().increment(hashKey, "amount", amount))
                    .map(Number::longValue)
                    .orElse(amount);

            redisTemplate.opsForZSet().add(zsetKey(buildId, GOLD_NAMESPACE), member, updatedAmount);
        }
    }

    @Override
    public void saveCardGradeProjection(Long userId, long sCount, long aCount) {
        synchronized (cardGradeMonitor) {
            saveCardGradeProjection(currentBuildId(CARD_GRADE_NAMESPACE), userId, sCount, aCount);
        }
    }

    @Override
    public void saveCardStatProjection(Long userId, int statTotal, long achievedAtEpochMillis, Long representativeCardId) {
        synchronized (cardStatMonitor) {
            saveCardStatProjection(currentBuildId(CARD_STAT_NAMESPACE), userId, statTotal, achievedAtEpochMillis, representativeCardId);
        }
    }

    @Override
    public void deleteUserProjection(Long userId) {
        synchronized (goldMonitor) {
            deleteProjection(currentBuildId(GOLD_NAMESPACE), GOLD_NAMESPACE, userId);
        }
        synchronized (cardGradeMonitor) {
            deleteProjection(currentBuildId(CARD_GRADE_NAMESPACE), CARD_GRADE_NAMESPACE, userId);
        }
        synchronized (cardStatMonitor) {
            deleteProjection(currentBuildId(CARD_STAT_NAMESPACE), CARD_STAT_NAMESPACE, userId);
        }
    }

    @Override
    public String getCurrentGoldBuildId() {
        return currentBuildId(GOLD_NAMESPACE);
    }

    @Override
    public List<GoldProjection> findTopGoldEarned(String buildId, int limit) {
        return readGoldProjections(buildId, topMembers(buildId, GOLD_NAMESPACE, limit));
    }

    @Override
    public Long findGoldRank(String buildId, Long userId) {
        return findRank(buildId, GOLD_NAMESPACE, userId);
    }

    @Override
    public Optional<GoldProjection> findGoldProjection(String buildId, Long userId) {
        return readGoldProjection(buildId, userId);
    }

    @Override
    public String getCurrentCardGradeBuildId() {
        return currentBuildId(CARD_GRADE_NAMESPACE);
    }

    @Override
    public List<CardGradeProjection> findTopCardGradeProjections(String buildId, int limit) {
        return readCardGradeProjections(buildId, topMembers(buildId, CARD_GRADE_NAMESPACE, limit));
    }

    @Override
    public Long findCardGradeRank(String buildId, Long userId) {
        return findRank(buildId, CARD_GRADE_NAMESPACE, userId);
    }

    @Override
    public Optional<CardGradeProjection> findCardGradeProjection(String buildId, Long userId) {
        return readCardGradeProjection(buildId, userId);
    }

    @Override
    public String getCurrentCardStatBuildId() {
        return currentBuildId(CARD_STAT_NAMESPACE);
    }

    @Override
    public List<CardStatProjection> findTopCardStatProjections(String buildId, int limit) {
        return readCardStatProjections(buildId, topMembers(buildId, CARD_STAT_NAMESPACE, limit));
    }

    @Override
    public Long findCardStatRank(String buildId, Long userId) {
        return findRank(buildId, CARD_STAT_NAMESPACE, userId);
    }

    @Override
    public Optional<CardStatProjection> findCardStatProjection(String buildId, Long userId) {
        return readCardStatProjection(buildId, userId);
    }

    @Override
    public void replaceGoldRankings(List<RankingAggregationRepository.GoldRankingAggregate> aggregates) {
        synchronized (goldMonitor) {
            String previousBuild = currentBuildId(GOLD_NAMESPACE);
            String nextBuild = nextBuildId();
            String nextZsetKey = zsetKey(nextBuild, GOLD_NAMESPACE);

            redisTemplate.delete(namespacedKeys(nextBuild, GOLD_NAMESPACE));
            for (RankingAggregationRepository.GoldRankingAggregate aggregate : aggregates) {
                String hashKey = userHashKey(nextBuild, GOLD_NAMESPACE, aggregate.userId());
                redisTemplate.opsForHash().put(hashKey, "amount", Long.toString(aggregate.gold()));
                redisTemplate.opsForZSet().add(nextZsetKey, member(aggregate.userId()), aggregate.gold());
            }

            switchBuild(GOLD_NAMESPACE, nextBuild);
            if (!DEFAULT_BUILD.equals(previousBuild)) {
                redisTemplate.delete(namespacedKeys(previousBuild, GOLD_NAMESPACE));
            }
        }
    }

    @Override
    public void replaceCardGradeRankings(List<RankingAggregationRepository.CardGradeCountRankingAggregate> aggregates) {
        synchronized (cardGradeMonitor) {
            String previousBuild = currentBuildId(CARD_GRADE_NAMESPACE);
            String nextBuild = nextBuildId();
            String nextZsetKey = zsetKey(nextBuild, CARD_GRADE_NAMESPACE);

            redisTemplate.delete(namespacedKeys(nextBuild, CARD_GRADE_NAMESPACE));
            for (RankingAggregationRepository.CardGradeCountRankingAggregate aggregate : aggregates) {
                saveCardGradeProjection(nextBuild, aggregate.userId(), aggregate.sCount(), aggregate.aCount());
            }

            switchBuild(CARD_GRADE_NAMESPACE, nextBuild);
            if (!DEFAULT_BUILD.equals(previousBuild)) {
                redisTemplate.delete(namespacedKeys(previousBuild, CARD_GRADE_NAMESPACE));
            }
        }
    }

    @Override
    public void replaceCardStatRankings(List<RankingAggregationRepository.CardStatTotalRankingAggregate> aggregates) {
        synchronized (cardStatMonitor) {
            String previousBuild = currentBuildId(CARD_STAT_NAMESPACE);
            String nextBuild = nextBuildId();
            String nextZsetKey = zsetKey(nextBuild, CARD_STAT_NAMESPACE);

            redisTemplate.delete(namespacedKeys(nextBuild, CARD_STAT_NAMESPACE));
            for (RankingAggregationRepository.CardStatTotalRankingAggregate aggregate : aggregates) {
                saveCardStatProjection(
                        nextBuild,
                        aggregate.userId(),
                        aggregate.statTotal(),
                        toEpochMillis(aggregate.achievedAt()),
                        aggregate.representativeCardId()
                );
            }

            switchBuild(CARD_STAT_NAMESPACE, nextBuild);
            if (!DEFAULT_BUILD.equals(previousBuild)) {
                redisTemplate.delete(namespacedKeys(previousBuild, CARD_STAT_NAMESPACE));
            }
        }
    }

    private void saveCardGradeProjection(String buildId, Long userId, long sCount, long aCount) {
        String hashKey = userHashKey(buildId, CARD_GRADE_NAMESPACE, userId);
        redisTemplate.opsForHash().put(hashKey, "sCount", Long.toString(sCount));
        redisTemplate.opsForHash().put(hashKey, "aCount", Long.toString(aCount));
        redisTemplate.opsForZSet().add(zsetKey(buildId, CARD_GRADE_NAMESPACE), member(userId), packCardGradeScore(sCount, aCount));
    }

    private void saveCardStatProjection(String buildId, Long userId, int statTotal, long achievedAtEpochMillis, Long representativeCardId) {
        String hashKey = userHashKey(buildId, CARD_STAT_NAMESPACE, userId);
        redisTemplate.opsForHash().put(hashKey, "statTotal", Integer.toString(statTotal));
        redisTemplate.opsForHash().put(hashKey, "achievedAt", Long.toString(achievedAtEpochMillis));
        redisTemplate.opsForHash().put(hashKey, "representativeCardId", representativeCardId == null ? "" : representativeCardId.toString());
        redisTemplate.opsForZSet().add(zsetKey(buildId, CARD_STAT_NAMESPACE), member(userId), statTotal);
    }

    private void deleteProjection(String buildId, String namespace, Long userId) {
        redisTemplate.opsForZSet().remove(zsetKey(buildId, namespace), member(userId));
        redisTemplate.delete(userHashKey(buildId, namespace, userId));
    }

    private List<String> topMembers(String buildId, String namespace, int limit) {
        Set<String> members = redisTemplate.opsForZSet()
                .reverseRange(zsetKey(buildId, namespace), 0, Math.max(limit - 1L, 0L));
        if (members == null || members.isEmpty()) {
            return List.of();
        }
        return new ArrayList<>(members);
    }

    private Long findRank(String buildId, String namespace, Long userId) {
        Long rank = redisTemplate.opsForZSet().reverseRank(zsetKey(buildId, namespace), member(userId));
        return rank == null ? null : rank + 1;
    }

    private List<GoldProjection> readGoldProjections(String buildId, List<String> members) {
        List<GoldProjection> projections = new ArrayList<>();
        for (String member : members) {
            parseUserId(member).flatMap(userId -> readGoldProjection(buildId, userId)).ifPresent(projections::add);
        }
        return projections;
    }

    private Optional<GoldProjection> readGoldProjection(String buildId, Long userId) {
        String value = (String) redisTemplate.opsForHash().get(userHashKey(buildId, GOLD_NAMESPACE, userId), "amount");
        if (value == null) {
            return Optional.empty();
        }
        return Optional.of(new GoldProjection(userId, Long.parseLong(value)));
    }

    private List<CardGradeProjection> readCardGradeProjections(String buildId, List<String> members) {
        List<CardGradeProjection> projections = new ArrayList<>();
        for (String member : members) {
            parseUserId(member).flatMap(userId -> readCardGradeProjection(buildId, userId)).ifPresent(projections::add);
        }
        return projections;
    }

    private Optional<CardGradeProjection> readCardGradeProjection(String buildId, Long userId) {
        String hashKey = userHashKey(buildId, CARD_GRADE_NAMESPACE, userId);
        String sCount = (String) redisTemplate.opsForHash().get(hashKey, "sCount");
        String aCount = (String) redisTemplate.opsForHash().get(hashKey, "aCount");
        if (sCount == null || aCount == null) {
            return Optional.empty();
        }
        return Optional.of(new CardGradeProjection(userId, Long.parseLong(sCount), Long.parseLong(aCount)));
    }

    private List<CardStatProjection> readCardStatProjections(String buildId, List<String> members) {
        List<CardStatProjection> projections = new ArrayList<>();
        for (String member : members) {
            parseUserId(member).flatMap(userId -> readCardStatProjection(buildId, userId)).ifPresent(projections::add);
        }
        return projections;
    }

    private Optional<CardStatProjection> readCardStatProjection(String buildId, Long userId) {
        String hashKey = userHashKey(buildId, CARD_STAT_NAMESPACE, userId);
        String statTotal = (String) redisTemplate.opsForHash().get(hashKey, "statTotal");
        String achievedAt = (String) redisTemplate.opsForHash().get(hashKey, "achievedAt");
        String representativeCardId = (String) redisTemplate.opsForHash().get(hashKey, "representativeCardId");
        if (statTotal == null || achievedAt == null) {
            return Optional.empty();
        }
        Long cardId = (representativeCardId == null || representativeCardId.isBlank())
                ? null
                : Long.parseLong(representativeCardId);
        return Optional.of(new CardStatProjection(userId, Integer.parseInt(statTotal), Long.parseLong(achievedAt), cardId));
    }

    private String currentBuildId(String namespace) {
        String buildId = redisTemplate.opsForValue().get(currentBuildKey(namespace));
        return (buildId == null || buildId.isBlank()) ? DEFAULT_BUILD : buildId;
    }

    private void switchBuild(String namespace, String buildId) {
        redisTemplate.opsForValue().set(currentBuildKey(namespace), buildId);
    }

    private String currentBuildKey(String namespace) {
        return KEY_PREFIX + ":" + namespace + ":current-build";
    }

    private String zsetKey(String buildId, String namespace) {
        return KEY_PREFIX + ":build:" + buildId + ":" + namespace + ":zset";
    }

    private String userHashKey(String buildId, String namespace, Long userId) {
        return KEY_PREFIX + ":build:" + buildId + ":user:" + userId + ":" + namespace;
    }

    private Collection<String> namespacedKeys(String buildId, String namespace) {
        Set<String> keys = redisTemplate.keys(KEY_PREFIX + ":build:" + buildId + ":*:" + namespace);
        Set<String> matchedKeys = new LinkedHashSet<>();
        matchedKeys.add(zsetKey(buildId, namespace));
        if (keys != null) {
            matchedKeys.addAll(keys);
        }
        return matchedKeys;
    }

    private String nextBuildId() {
        return Long.toString(System.currentTimeMillis());
    }

    private String member(Long userId) {
        return Objects.toString(userId);
    }

    private Optional<Long> parseUserId(String member) {
        if (member == null || member.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(Long.parseLong(member));
    }

    private double packCardGradeScore(long sCount, long aCount) {
        return (double) (sCount * CARD_GRADE_SCORE_MULTIPLIER + aCount);
    }

    private long toEpochMillis(LocalDateTime dateTime) {
        return dateTime.toInstant(ZoneOffset.UTC).toEpochMilli();
    }
}
