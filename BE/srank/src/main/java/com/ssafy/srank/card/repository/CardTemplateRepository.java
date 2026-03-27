package com.ssafy.srank.card.repository;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.enums.CardGrade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardTemplateRepository extends JpaRepository<CardTemplate, Long> {

    // 실제 가챠 풀에 들어갈 수 있는 템플릿만 조회한다.
    List<CardTemplate> findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalse(CardGrade grade);

    // PF 검증 시 같은 입력이면 같은 카드가 선택되도록 ID 순으로 고정 정렬한다.
    List<CardTemplate> findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalseOrderByIdAsc(CardGrade grade);
}
