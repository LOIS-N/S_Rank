package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.MainQuestTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MainQuestTemplateRepository extends JpaRepository<MainQuestTemplate, Long> {

    // 특정 챕터의 모든 스텝 조회 (순서대로)
    List<MainQuestTemplate> findByChapterNoAndIsActiveTrueOrderByStepNoAsc(int chapterNo);

    // 챕터/스텝으로 단건 조회
    Optional<MainQuestTemplate> findByChapterNoAndStepNoAndIsActiveTrue(int chapterNo, int stepNo);

    // 가장 작은 챕터 번호 조회 (챕터 1부터 시작)
    @Query("SELECT MIN(m.chapterNo) FROM MainQuestTemplate m WHERE m.isActive = true")
    Optional<Integer> findMinChapterNo();
}
