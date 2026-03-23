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
            int limit
    );

    UserCardResponse getUserCardDetail(Long userId, Long cardId);
    Set<Long> getUsedUserCardList(Long userId);
    long countActiveCards(Long userId);
    List<UserCard> saveUserCards(List<UserCard> userCards);
}
