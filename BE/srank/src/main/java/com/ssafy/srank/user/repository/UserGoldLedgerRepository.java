package com.ssafy.srank.user.repository;

import com.ssafy.srank.user.domain.entity.UserGoldLedger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserGoldLedgerRepository extends JpaRepository<UserGoldLedger, Long> {

    Optional<UserGoldLedger> findTopByUserIdOrderByIdDesc(Long userId);
}
