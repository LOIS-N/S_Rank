package com.ssafy.srank.card.application.service;

import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;

import java.util.List;
import java.util.Set;

public interface UserCardService {
    CursorPageResponse<UserCardResponse> getUserCards(
            Long userId,
            PositionType statType,
            SortType sortType,
            String cursorToken,
            int limit,
            boolean isEnhance
    );

    UserCardResponse getUserCardDetail(Long userId, Long cardId);
    long countActiveCards(Long userId);
    List<UserCard> saveUserCards(List<UserCard> userCards);
    void validateCardsOwned(Long userId, List<Long> cards);
    void applyEnhanceSuccess(Long userId, Long cardId, int value1, int value2, int value3);
    void applyEnhanceFail(Long userId, Long cardId);
}