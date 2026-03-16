package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.QuestStatus;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserMainQuestRepository extends JpaRepository<UserMainQuest, Long> {

    // 유저의 특정 템플릿들에 대한 상태 조회
    @Query("SELECT u FROM UserMainQuest u WHERE u.userId = :userId AND u.mainQuestTemplate.id IN :templateIds")
    List<UserMainQuest> findByUserIdAndTemplateIds(@Param("userId") Long userId, @Param("templateIds") List<Long> templateIds);

    // 유저의 특정 템플릿 단건 상태 조회
    @Query("SELECT u FROM UserMainQuest u WHERE u.userId = :userId AND u.mainQuestTemplate.id = :templateId")
    Optional<UserMainQuest> findByUserIdAndTemplateId(@Param("userId") Long userId, @Param("templateId") Long templateId);
}
