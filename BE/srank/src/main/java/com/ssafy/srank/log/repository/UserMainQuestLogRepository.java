package com.ssafy.srank.log.repository;

import com.ssafy.srank.log.domain.entity.UserMainQuestLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserMainQuestLogRepository extends JpaRepository<UserMainQuestLog, Long> {
}
