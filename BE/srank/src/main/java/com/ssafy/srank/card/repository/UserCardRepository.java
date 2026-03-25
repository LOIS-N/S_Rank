package com.ssafy.srank.card.repository;

import com.ssafy.srank.card.domain.entity.UserCard;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserCardRepository extends JpaRepository<UserCard, Long> {

    int countByIdInAndUserId(List<Long> cards, Long userId);

    Optional<UserCard> findByIdAndUserIdAndIsDeletedFalse(Long id, Long userId);

    @Query("select uc from UserCard uc where uc.userId = :userId and uc.id in :ids and uc.isDeleted = false")
    List<UserCard> findAllActiveByUserIdAndIdIn(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "0"))
    @Query("""
            select uc
            from UserCard uc
            where uc.userId = :userId
              and uc.id in :ids
              and uc.isDeleted = false
            order by uc.id asc
            """)
    List<UserCard> findAllActiveByUserIdAndIdInForUpdate(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    @Query("select count(uc) from UserCard uc where uc.userId = :userId and uc.isDeleted = false")
    long countActiveByUserId(@Param("userId") Long userId);
    int countByUserIdAndIsDeletedFalse(Long userId);
    int countByUserIdAndIsDeletedFalseAndEnhanceTryCountLessThan(Long userId, int enhanceTryCount);
}
