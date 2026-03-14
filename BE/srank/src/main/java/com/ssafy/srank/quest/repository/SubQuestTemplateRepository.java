package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.SubQuestTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SubQuestTemplateRepository extends JpaRepository<SubQuestTemplate, Long> {

    // 당일 서브 퀘스트 난이도별 랜덤 5개 조회
    @Query(value = """
            SELECT * FROM (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY difficulty ORDER BY RANDOM()) AS rn
                FROM sub_quest_template
                WHERE is_active = true
                AND CAST(quest_date AS DATE) = :today
            ) ranked
            WHERE rn <= 5
            ORDER BY difficulty ASC
            """, nativeQuery = true)
    List<SubQuestTemplate> findTodaySubQuests(@Param("today") LocalDate today);
}
