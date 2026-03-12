package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.QuestStatus;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface UserMainQuestRepository extends JpaRepository<UserMainQuest, Long> {

    // 유저의 특정 상태 퀘스트 목록 조회
    List<UserMainQuest> findByUserIdAndStatus(Long userId, QuestStatus status);

    // 유저가 완료(CLAIMED)한 템플릿 ID 목록 조회
    @Query("SELECT u.mainQuestTemplate.id FROM UserMainQuest u WHERE u.userId = :userId AND u.status = 'CLAIMED'")
    Set<Long> findClaimedTemplateIdsByUserId(@Param("userId") Long userId);

    // 유저가 현재 진행 중인 퀘스트의 템플릿 ID 목록 조회
    @Query("SELECT u.mainQuestTemplate.id FROM UserMainQuest u WHERE u.userId = :userId AND u.status = 'IN_PROGRESS'")
    Set<Long> findInProgressTemplateIdsByUserId(@Param("userId") Long userId);
}
