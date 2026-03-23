package com.ssafy.srank.card.repository;

import com.ssafy.srank.card.domain.entity.SpecialSkillTemplate;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpecialSkillTemplateRepository extends JpaRepository<SpecialSkillTemplate, Long> {

    @EntityGraph(attributePaths = "effects")
    Optional<SpecialSkillTemplate> findWithEffectsById(Long id);

    @EntityGraph(attributePaths = "effects")
    List<SpecialSkillTemplate> findAllByActiveTrueAndDeletedFalseOrderByIdAsc();
}
