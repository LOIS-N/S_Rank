package com.ssafy.srank.card.repository;

import com.ssafy.srank.card.application.dto.response.UserCardCursor;
import com.ssafy.srank.card.application.dto.response.UserCardFlatResponse;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;

import java.util.List;

public interface UserCardQueryRepository {

    List<UserCardFlatResponse> findUserCards(
            Long userId,
            PositionType statType,
            SortType sortType,
            UserCardCursor cursor,
            int limit
    );

}