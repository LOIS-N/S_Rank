package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import com.ssafy.srank.quest.domain.entity.UserMainQuestCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface UserMainQuestCardRepository extends JpaRepository<UserMainQuestCard, Long> {
    List<UserMainQuestCard> findByUserCardIdInAndUserId(List<Long> ids, Long userId);
    void deleteByUserIdAndUserMainQuest_Id(Long userId, Long userMainQuestId);
    List<UserMainQuestCard> findByUserId(Long userId);
    List<UserMainQuestCard> findByUserIdAndUserMainQuestIn(Long userId, List<UserMainQuest> quests);
    List<UserMainQuestCard> findByUserIdAndUserMainQuest_Id(Long userId, Long questId);
}
