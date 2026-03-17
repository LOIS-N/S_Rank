package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.UserSubQuestCard;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSubQuestCardRepository extends JpaRepository<UserSubQuestCard, Long> {
    boolean existsByUserIdAndUserCardId(Long userId, Long cardId);

}
