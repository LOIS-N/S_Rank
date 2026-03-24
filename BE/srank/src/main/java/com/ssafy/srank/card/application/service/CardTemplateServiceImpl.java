package com.ssafy.srank.card.application.service;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.repository.CardTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CardTemplateServiceImpl implements CardTemplateService {

    private final CardTemplateRepository cardTemplateRepository;

    @Override
    public List<CardTemplate> getDrawableTemplates(CardGrade grade) {
        return cardTemplateRepository.findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalse(grade);
    }
}
