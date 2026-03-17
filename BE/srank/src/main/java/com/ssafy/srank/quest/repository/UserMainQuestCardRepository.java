package com.ssafy.srank.quest.repository;

import com.ssafy.srank.quest.domain.entity.UserMainQuestCard;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserMainQuestCardRepository extends JpaRepository<UserMainQuestCard, Long> {
    boolean existsByUserIdAndUserCardId(Long userId, Long cardId);
}
