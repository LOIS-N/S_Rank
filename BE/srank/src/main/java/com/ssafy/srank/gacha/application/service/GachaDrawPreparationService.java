package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.gacha.application.service.model.PreparedDraw;
import com.ssafy.srank.gacha.domain.enums.GachaType;

import java.util.List;

public interface GachaDrawPreparationService {

    List<PreparedDraw> createPreparedDraws(
            Long userId,
            GachaType type,
            String clientSeed,
            ProbablyFairContext pfContext,
            int count
    );
}
