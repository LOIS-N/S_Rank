package com.ssafy.srank.user.repository;

import com.ssafy.srank.user.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByPrivyId(String privyId);

    Optional<User> findByEmail(String email);

    Optional<User> findByWalletAddress(String walletAddress);

    boolean existsByNicknameAndDeletedAtIsNull(String nickname);
}
