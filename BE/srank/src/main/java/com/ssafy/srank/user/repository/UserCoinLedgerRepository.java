package com.ssafy.srank.user.repository;

import com.ssafy.srank.user.domain.entity.UserCoinLedger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserCoinLedgerRepository extends JpaRepository<UserCoinLedger, Long> {

    Optional<UserCoinLedger> findTopByUserIdOrderByIdDesc(Long userId);
}
