package com.ssafy.srank.card.repository;

import com.ssafy.srank.card.domain.entity.UserCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserCardRepository extends JpaRepository<UserCard, Long> {
    Optional<UserCard> findByIdAndUserId(Long id, Long userId);
}
