package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.QuestStatus;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserMainQuestRepository extends JpaRepository<UserMainQuest, Long> {

    //사용자 진행중인(+완료) 메인퀘스트 전체 조회
    List<UserMainQuest> findByUserIdAndStatusNot(Long userId, QuestStatus status);

    // 유저의 특정 템플릿들에 대한 상태 조회
    @Query("SELECT u FROM UserMainQuest u WHERE u.userId = :userId AND u.mainQuestTemplate.id IN :templateIds")
    List<UserMainQuest> findByUserIdAndTemplateIds(@Param("userId") Long userId, @Param("templateIds") List<Long> templateIds);

    // 유저의 특정 템플릿 단건 상태 조회
    @Query("SELECT u FROM UserMainQuest u WHERE u.userId = :userId AND u.mainQuestTemplate.id = :templateId")
    Optional<UserMainQuest> findByUserIdAndTemplateId(@Param("userId") Long userId, @Param("templateId") Long templateId);

    @Query("SELECT u FROM UserMainQuest u WHERE u.userId = :userId AND u.mainQuestTemplate.chapterNo = :chapterNo AND u.status =:status")
    List<UserMainQuest> findByUserIdAndChapterNoAndStatus(@Param("userId") Long userId, @Param("chapterNo") int chapterNo, @Param("status") QuestStatus status);

    Optional<UserMainQuest> findByIdAndUserId(Long questId, Long userId);

    Optional<UserMainQuest> findByIdAndUserIdAndStatus(Long id, Long userId, QuestStatus status);
}
