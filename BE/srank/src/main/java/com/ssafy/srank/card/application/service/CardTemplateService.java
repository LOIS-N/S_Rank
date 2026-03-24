package com.ssafy.srank.card.application.service;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.enums.CardGrade;

import java.util.List;

public interface CardTemplateService {
    List<CardTemplate> getDrawableTemplates(CardGrade grade);
}
