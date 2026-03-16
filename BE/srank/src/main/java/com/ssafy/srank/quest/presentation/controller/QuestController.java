package com.ssafy.srank.quest.presentation.controller;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.quest.application.dto.response.MainQuestResponse;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.application.dto.response.SubQuestResponse;
import com.ssafy.srank.quest.application.service.MainQuestService;
import com.ssafy.srank.quest.application.service.SubQuestService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Quest", description = "퀘스트 API")
@RestController
@RequestMapping("/api/v1/quests")
@RequiredArgsConstructor
public class QuestController {

    private final MainQuestService mainQuestService;
    private final SubQuestService subQuestService;

    @GetMapping("/main")
    public ResponseEntity<ApiResponse<List<MainQuestResponse>>> getMainQuests(
            @RequestHeader("X-User-Id") Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.success(mainQuestService.getMainQuests(userId)));
    }

    @GetMapping("/sub")
    public ResponseEntity<ApiResponse<List<SubQuestResponse>>> getSubQuests(
            @RequestHeader("X-User-Id") Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.success(subQuestService.getSubQuests(userId)));
    }

    @GetMapping("/{questId}")
    public ResponseEntity<ApiResponse<QuestDetailResponse>> getQuestDetail(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long questId,
            @RequestParam String type
    ) {
        if ("sub".equalsIgnoreCase(type)) {
            return ResponseEntity.ok(ApiResponse.success(
                    subQuestService.getSubQuestDetail(userId, questId)
            ));
        } else if ("main".equalsIgnoreCase(type)) {
            return ResponseEntity.ok(ApiResponse.success(
                    mainQuestService.getMainQuestDetail(userId, questId)
            ));
        }

        throw new BusinessException(ErrorCode.INVALID_QUEST_TYPE);
    }
}