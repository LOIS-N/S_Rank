package com.ssafy.srank.log.repository;

import com.ssafy.srank.log.domain.entity.UserQuestLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserQuestLogRepository extends JpaRepository<UserQuestLog,Long> {
}
