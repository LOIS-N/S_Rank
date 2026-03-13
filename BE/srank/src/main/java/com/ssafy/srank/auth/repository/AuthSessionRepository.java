package com.ssafy.srank.auth.repository;

import com.ssafy.srank.auth.domain.entity.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuthSessionRepository extends JpaRepository<AuthSession, String> {

    List<AuthSession> findAllByUserIdAndRevokedAtIsNull(Long userId);
}
