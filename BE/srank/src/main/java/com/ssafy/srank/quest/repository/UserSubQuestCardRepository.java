package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.UserMainQuestCard;
import com.ssafy.srank.quest.domain.entity.UserSubQuest;
import com.ssafy.srank.quest.domain.entity.UserSubQuestCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserSubQuestCardRepository extends JpaRepository<UserSubQuestCard, Long> {
    List<UserSubQuestCard> findByUserCardIdInAndUserId(List<Long> ids, Long userId);
    boolean existsByUserIdAndUserCardId(Long userId, Long cardId);
    void deleteByUserIdAndUserSubQuest_Id(Long userId, Long userSubQuestId);
    List<UserSubQuestCard> findByUserIdAndUserSubQuestIn(Long userId, List<UserSubQuest> inProcessQuestList);
    List<UserSubQuestCard> findByUserId(Long userId);
    List<UserSubQuestCard> findByUserIdAndUserSubQuest_Id(Long userId, Long questId);
}
