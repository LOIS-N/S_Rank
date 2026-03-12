package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.SubQuestTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SubQuestTemplateRepository extends JpaRepository<SubQuestTemplate, Long> {

    // 당일 서브 퀘스트 난이도별 5개 조회
    @Query("""
            SELECT s FROM SubQuestTemplate s
            WHERE s.isActive = true
            AND CAST(s.questDate AS LocalDate) = :today
            ORDER BY s.difficulty ASC, RANDOM()
            """)
    List<SubQuestTemplate> findTodaySubQuests(@Param("today") LocalDate today);

    // 난이도별 당일 퀘스트 조회 (난이도별 5개 제한)
    @Query(value = """
            SELECT * FROM sub_quest_template
            WHERE is_active = true
              AND CAST(quest_date AS DATE) = :today
            ORDER BY difficulty ASC, RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<SubQuestTemplate> findTodaySubQuestsByDifficulty(
            @Param("today") LocalDate today,
            @Param("limit") int limit
    );
}
