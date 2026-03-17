package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.UserDeskQuest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserDeskQuestRepository extends JpaRepository<UserDeskQuest, Long> {
    List<UserDeskQuest> findByUserId(Long userId);
}
