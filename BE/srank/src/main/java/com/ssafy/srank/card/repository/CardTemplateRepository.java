package com.ssafy.srank.card.repository;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.enums.CardGrade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardTemplateRepository extends JpaRepository<CardTemplate, Long> {

    List<CardTemplate> findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalse(CardGrade grade);
}
