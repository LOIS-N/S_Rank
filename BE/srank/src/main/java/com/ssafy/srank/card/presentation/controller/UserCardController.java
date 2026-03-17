package com.ssafy.srank.card.presentation.controller;

import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.application.service.UserCardServiceImpl;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;
import com.ssafy.srank.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cards")
@RequiredArgsConstructor
public class UserCardController {

    private final UserCardServiceImpl userCardServiceImpl;

    /**
     * GET /api/v1/cards?statType={position}&cursor={token}&limit={n}
     *
     * 정렬: 등급순 > 능력치 총합 > cardId asc
     * 필터: statType (nullable)
     * 커서: Base64 인코딩된 "gradePriority:totalStat:cardId"
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CursorPageResponse<UserCardResponse>>> getUserCards(
            @RequestParam(required = false) PositionType statType,
            @RequestParam(required = false, defaultValue = "GRADE") SortType sortType,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "30") int limit,
            // TODO: Security 도입 후 @AuthenticationPrincipal 로 교체
            @RequestParam Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.success(userCardServiceImpl.getUserCards(userId, statType, sortType, cursor, limit)));
    }

    @GetMapping("/{cardId}")
    public ResponseEntity<ApiResponse<UserCardResponse>> getUserCardDetail(
            // TODO: Security 도입 후 @AuthenticationPrincipal 로 교체
            @RequestParam Long userId,
            @PathVariable Long cardId
    ) {
        return ResponseEntity.ok(ApiResponse.success(userCardServiceImpl.getUserCardDetail(userId, cardId)));
    }
}
