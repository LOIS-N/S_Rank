package com.ssafy.srank.ranking.repository;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class RankingAggregationRepositoryImpl implements RankingAggregationRepository {

    private final EntityManager entityManager;

    @Override
    public List<GoldRankingAggregate> findTopGoldRankings(int limit) {
        String sql = """
                SELECT
                    u.user_id,
                    u.nickname,
                    COALESCE(SUM(CASE WHEN ugl.amount > 0 THEN ugl.amount ELSE 0 END), 0) AS gold
                FROM users u
                LEFT JOIN user_gold_log ugl ON ugl.user_id = u.user_id
                WHERE u.deleted_at IS NULL
                GROUP BY u.user_id, u.nickname
                ORDER BY gold DESC, u.user_id ASC
                LIMIT :limit
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql)
                .setParameter("limit", limit)
                .getResultList();

        return rows.stream()
                .map(row -> new GoldRankingAggregate(
                        toLong(row[0]),
                        (String) row[1],
                        toLong(row[2])
                ))
                .toList();
    }

    @Override
    public List<CardGradeCountRankingAggregate> findTopCardGradeCountRankings(int limit) {
        String sql = """
                SELECT
                    u.user_id,
                    u.nickname,
                    COALESCE(SUM(CASE WHEN ct.grade = 'S' THEN 1 ELSE 0 END), 0) AS s_count,
                    COALESCE(SUM(CASE WHEN ct.grade = 'A' THEN 1 ELSE 0 END), 0) AS a_count
                FROM users u
                LEFT JOIN user_card uc
                    ON uc.user_id = u.user_id
                    AND uc.is_delete = false
                LEFT JOIN card_template ct
                    ON ct.card_template_id = uc.card_template_id
                    AND ct.is_hidden = false
                    AND ct.is_active = true
                    AND ct.is_deleted = false
                WHERE u.deleted_at IS NULL
                GROUP BY u.user_id, u.nickname
                ORDER BY s_count DESC, a_count DESC, u.user_id ASC
                LIMIT :limit
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql)
                .setParameter("limit", limit)
                .getResultList();

        return rows.stream()
                .map(row -> new CardGradeCountRankingAggregate(
                        toLong(row[0]),
                        (String) row[1],
                        toLong(row[2]),
                        toLong(row[3])
                ))
                .toList();
    }

    @Override
    public List<CardStatTotalRankingAggregate> findCardStatTotalRankings() {
        String sql = """
                WITH valid_cards AS (
                    SELECT
                        u.user_id,
                        u.nickname,
                        uc.user_card_id,
                        (uc.base_skill_value_1 + uc.bonus_skill_value_1
                         + uc.base_skill_value_2 + uc.bonus_skill_value_2
                         + uc.base_skill_value_3 + uc.bonus_skill_value_3) AS stat_total,
                        COALESCE(MAX(CASE WHEN el.success = true THEN el.created_at END), uc.created_at) AS achieved_at
                    FROM user_card uc
                    JOIN users u
                        ON u.user_id = uc.user_id
                    JOIN card_template ct
                        ON ct.card_template_id = uc.card_template_id
                    LEFT JOIN enhancement_log el
                        ON el.user_card_id = uc.user_card_id
                        AND el.success = true
                    WHERE uc.is_delete = false
                        AND u.deleted_at IS NULL
                        AND ct.is_hidden = false
                        AND ct.is_active = true
                        AND ct.is_deleted = false
                    GROUP BY
                        u.user_id,
                        u.nickname,
                        uc.user_card_id,
                        uc.created_at,
                        uc.base_skill_value_1,
                        uc.bonus_skill_value_1,
                        uc.base_skill_value_2,
                        uc.bonus_skill_value_2,
                        uc.base_skill_value_3,
                        uc.bonus_skill_value_3
                ),
                representative_cards AS (
                    SELECT
                        vc.user_id,
                        vc.nickname,
                        vc.stat_total,
                        vc.achieved_at,
                        ROW_NUMBER() OVER (
                            PARTITION BY vc.user_id
                            ORDER BY vc.stat_total DESC, vc.achieved_at ASC, vc.user_card_id ASC
                        ) AS representative_rank
                    FROM valid_cards vc
                )
                SELECT
                    u.user_id,
                    u.nickname,
                    COALESCE(rc.stat_total, 0) AS stat_total,
                    COALESCE(rc.achieved_at, u.created_at) AS achieved_at
                FROM users u
                LEFT JOIN representative_cards rc
                    ON rc.user_id = u.user_id
                    AND rc.representative_rank = 1
                WHERE u.deleted_at IS NULL
                ORDER BY COALESCE(rc.stat_total, 0) DESC, COALESCE(rc.achieved_at, u.created_at) ASC, u.user_id ASC
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql)
                .getResultList();

        return rows.stream()
                .map(row -> new CardStatTotalRankingAggregate(
                        toLong(row[0]),
                        (String) row[1],
                        toInt(row[2]),
                        toLocalDateTime(row[3])
                ))
                .toList();
    }

    private long toLong(Object value) {
        return ((Number) value).longValue();
    }

    private int toInt(Object value) {
        return ((Number) value).intValue();
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value instanceof LocalDateTime dateTime) {
            return dateTime;
        }
        return ((Timestamp) value).toLocalDateTime();
    }
}
