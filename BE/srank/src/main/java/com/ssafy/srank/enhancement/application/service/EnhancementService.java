package com.ssafy.srank.enhancement.application.service;

import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;
import com.ssafy.srank.enhancement.application.dto.request.EnhancementRequest;
import com.ssafy.srank.enhancement.application.dto.response.EnhanceResultResponse;

public interface EnhancementService {

    // 강화 가능 카드 목록 조회 (커서 기반 페이지네이션)
    CursorPageResponse<UserCardResponse> getEnhancementCardList(Long userId, PositionType statType,
                                                                SortType sortType, String cursorToken, int limit);

    // 강화 진행
    EnhanceResultResponse enhanceCard(Long userId, EnhancementRequest request);
}
