package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.MainQuestTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MainQuestTemplateRepository extends JpaRepository<MainQuestTemplate, Long> {

    // 챕터 기준 템플릿 목록 조회
    @Query("SELECT t FROM MainQuestTemplate t WHERE t.chapterNo = :chapterNo AND t.isActive = true ORDER BY t.stepNo ASC")
    List<MainQuestTemplate> findByChapterNo(@Param("chapterNo") int chapterNo);
}
