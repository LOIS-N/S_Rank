package com.ssafy.srank.user.repository;

import com.ssafy.srank.user.domain.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByPrivyId(String privyId);

    Optional<User> findByEmail(String email);

    Optional<User> findByWalletAddress(String walletAddress);

    boolean existsByNicknameAndDeletedAtIsNull(String nickname);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.userId = :userId")
    Optional<User> findByIdForUpdate(@Param("userId") Long userId);
}
