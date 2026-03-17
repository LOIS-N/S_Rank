package com.ssafy.srank.log.repository;

import com.ssafy.srank.log.domain.entity.EnhancementLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnhancementLogRepository extends JpaRepository<EnhancementLog, Long> {
}
