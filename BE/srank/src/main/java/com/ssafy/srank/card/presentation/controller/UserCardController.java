package com.ssafy.srank.card.presentation.controller;

import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.application.service.UserCardService;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;
import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.quest.application.service.QuestFacadeService;
import com.ssafy.srank.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cards")
@RequiredArgsConstructor
public class UserCardController {

    private final UserCardService userCardService;
    private final QuestFacadeService questFacadeService;

    /**
     * GET /api/v1/cards?statType={position}&cursor={token}&limit={n}
     *
     * 정렬: 등급순 > 능력치 총합 > cardId asc
     * 필터: statType (nullable)
     * 커서: Base64 인코딩한 "gradePriority:totalStat:cardId"
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CursorPageResponse<UserCardResponse>>> getUserCards(
            @RequestParam(required = false) PositionType statType,
            @RequestParam(required = false, defaultValue = "GRADE") SortType sortType,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "30") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                userCardService.getUserCards(SecurityUtil.getCurrentUserId(), statType, sortType, cursor, limit)
        ));
    }

    @GetMapping("/{cardId}")
    public ResponseEntity<ApiResponse<UserCardResponse>> getUserCardDetail(@PathVariable Long cardId) {
        return ResponseEntity.ok(ApiResponse.success(userCardService.getUserCardDetail(SecurityUtil.getCurrentUserId(), cardId)));
    }

    @GetMapping("/used")
    public ResponseEntity<ApiResponse<List<Long>>> getUsedUserCard(){
        return ResponseEntity.ok(ApiResponse.success(questFacadeService.getUsedUserCardList(SecurityUtil.getCurrentUserId())));
    }
}
