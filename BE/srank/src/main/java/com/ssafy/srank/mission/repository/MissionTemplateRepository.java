package com.ssafy.srank.mission.repository;

import com.ssafy.srank.mission.domain.entity.MissionTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MissionTemplateRepository extends JpaRepository<MissionTemplate, Long> {

    List<MissionTemplate> findAllByOrderByIdAsc();
}
