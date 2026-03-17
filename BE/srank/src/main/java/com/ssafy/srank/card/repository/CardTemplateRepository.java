package com.ssafy.srank.card.repository;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardTemplateRepository extends JpaRepository<CardTemplate, Long> {
}
