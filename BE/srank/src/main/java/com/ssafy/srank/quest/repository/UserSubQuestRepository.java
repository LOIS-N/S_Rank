package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.QuestStatus;
import com.ssafy.srank.quest.domain.entity.UserSubQuest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Set;

public interface UserSubQuestRepository extends JpaRepository<UserSubQuest, Long> {

    // 유저가 진행 중인 서브 퀘스트 템플릿 ID 목록
    @Query("SELECT u.subQuestTemplate.id FROM UserSubQuest u WHERE u.userId = :userId AND u.status = 'IN_PROGRESS'")
    Set<Long> findInProgressTemplateIdsByUserId(@Param("userId") Long userId);
}
