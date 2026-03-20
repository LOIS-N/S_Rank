package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import com.ssafy.srank.quest.domain.entity.UserMainQuestCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserMainQuestCardRepository extends JpaRepository<UserMainQuestCard, Long> {
    boolean existsByUserIdAndUserCardId(Long userId, Long cardId);
    void deleteByUserIdAndUserMainQuest_Id(Long userId, Long userMainQuestId);
    List<UserMainQuestCard> findByUserIdAndUserMainQuestIn(Long userId, List<UserMainQuest> quests);
}
