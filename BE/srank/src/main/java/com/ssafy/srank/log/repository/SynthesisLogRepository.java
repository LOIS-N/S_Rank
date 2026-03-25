package com.ssafy.srank.log.repository;

import com.ssafy.srank.log.domain.entity.SynthesisLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SynthesisLogRepository extends JpaRepository<SynthesisLog, Long> {
}
