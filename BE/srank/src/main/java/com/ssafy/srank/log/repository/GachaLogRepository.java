package com.ssafy.srank.log.repository;

import com.ssafy.srank.log.domain.entity.GachaLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GachaLogRepository extends JpaRepository<GachaLog, Long> {
}
