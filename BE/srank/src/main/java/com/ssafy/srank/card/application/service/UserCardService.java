package com.ssafy.srank.card.application.service;

import com.ssafy.srank.card.application.dto.request.DeleteCardRequest;
import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.MarketStatus;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;
import com.ssafy.srank.market.application.dto.response.SellableCardResponse;

import java.util.List;

public interface UserCardService {
    CursorPageResponse<UserCardResponse> getUserCards(
            Long userId,
            PositionType statType,
            SortType sortType,
            String cursorToken,
            int limit,
            boolean isEnhance
    );
    List<SellableCardResponse> getSellableUserCard(Long userId);
    UserCardResponse getUserCardDetail(Long userId, Long cardId);

    /** market 도메인에서 연관관계 설정용으로 사용 */
    UserCard getUserCardEntity(Long cardId);

    long countActiveCards(Long userId);
    List<UserCard> saveUserCards(List<UserCard> userCards);
    void validateCardsOwned(Long userId, List<Long> cards);
    void applyEnhanceSuccess(Long userId, Long cardId, int value1, int value2, int value3);
    void applyEnhanceFail(Long userId, Long cardId);
    void deleteCard(Long userId, DeleteCardRequest request);
    void changeMarketStatus(Long userId, Long cardId, MarketStatus status);
}
