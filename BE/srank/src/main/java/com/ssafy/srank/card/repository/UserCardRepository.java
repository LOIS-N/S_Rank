package com.ssafy.srank.card.repository;

import com.ssafy.srank.card.domain.entity.UserCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserCardRepository extends JpaRepository<UserCard, Long> {
    Optional<UserCard> findByIdAndUserId(Long id, Long userId);

    @Query("select count(uc) from UserCard uc where uc.userId = :userId and uc.isDeleted = false")
    long countActiveByUserId(@Param("userId") Long userId);
}
