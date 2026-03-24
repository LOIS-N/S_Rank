package com.ssafy.srank.enhancement.application.service;

import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.application.service.UserCardService;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;
import com.ssafy.srank.enhancement.application.dto.response.EnhanceResultResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EnhancementServiceImpl implements EnhancementService {

    private final UserCardService userCardService;

    @Override
    public CursorPageResponse<UserCardResponse> getEnhancementCardList(Long userId, PositionType statType, SortType sortType, String cursorToken, int limit) {
        return userCardService.getUserCards(userId, statType, sortType, cursorToken, limit);
    }

    @Override
    public EnhanceResultResponse enhanceCard(Long userId, Long cardId) {
        return null;
    }
}
