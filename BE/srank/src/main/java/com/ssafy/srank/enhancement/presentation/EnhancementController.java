package com.ssafy.srank.enhancement.presentation;

import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;
import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.enhancement.application.dto.request.EnhancementRequest;
import com.ssafy.srank.enhancement.application.dto.response.EnhanceResultResponse;
import com.ssafy.srank.enhancement.application.service.EnhancementService;
import com.ssafy.srank.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/enhancements")
@RequiredArgsConstructor
public class EnhancementController {

    private final EnhancementService enhancementService;

    /**
     * 강화 가능 카드 목록 조회
     * - enhanceTryCount < 7 인 카드만
     * - 등급 내림차순 정렬 (S → A → B → C → D)
     * - 커서 기반 무한스크롤
     */
    @GetMapping("/cards")
    public ResponseEntity<ApiResponse<CursorPageResponse<UserCardResponse>>> getEnhancementCardList(
            @RequestParam(required = false) PositionType statType,
            @RequestParam(required = false, defaultValue = "GRADE") SortType sortType,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "30") int limit
    ) {

        return ResponseEntity.ok(ApiResponse.success(
                enhancementService.getEnhancementCardList(
                        SecurityUtil.getCurrentUserId(),
                        statType,
                        sortType,
                        cursor,
                        limit
                )
        ));
    }

    @PostMapping("/cards/{cardId}")
    public ResponseEntity<ApiResponse<EnhanceResultResponse>> getEnhancementCardList(@RequestBody EnhancementRequest request){
        return ResponseEntity.ok(ApiResponse.success(enhancementService.enhanceCard(SecurityUtil.getCurrentUserId(), request)));
    }
}
