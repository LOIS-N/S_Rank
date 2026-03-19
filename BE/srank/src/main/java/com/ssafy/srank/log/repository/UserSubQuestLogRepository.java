package com.ssafy.srank.log.repository;

import com.ssafy.srank.log.domain.entity.UserSubQuestLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSubQuestLogRepository extends JpaRepository<UserSubQuestLog, Long> {
}
