package com.ssafy.srank.card.repository;

import com.ssafy.srank.card.domain.entity.UserCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserCardRepository extends JpaRepository<UserCard, Long> {

    int countByIdInAndUserId(List<Long> cards, Long userId);

    Optional<UserCard> findByIdAndUserId(Long id, Long userId);

    // soft-delete 되지 않은 카드만 인벤토리 용량 계산에 포함한다.
    @Query("select count(uc) from UserCard uc where uc.userId = :userId and uc.isDeleted = false")
    long countActiveByUserId(@Param("userId") Long userId);
}
