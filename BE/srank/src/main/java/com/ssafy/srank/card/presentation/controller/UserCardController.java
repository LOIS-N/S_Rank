package com.ssafy.srank.card.presentation.controller;

import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.application.service.UserCardService;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cards")
@RequiredArgsConstructor
public class UserCardController {

    private final UserCardService userCardService;

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
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "30") int limit,
            // TODO: Security 도입 후 @AuthenticationPrincipal 로 교체
            @RequestParam Long userId
    ) {
        CursorPageResponse<UserCardResponse> result =
                userCardService.getUserCards(userId, statType, cursor, limit);

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
