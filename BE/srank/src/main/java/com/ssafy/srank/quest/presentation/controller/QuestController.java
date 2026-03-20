package com.ssafy.srank.quest.presentation.controller;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.quest.application.dto.request.CompleteQuestRequest;
import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.MainQuestResponse;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.application.dto.response.SubQuestResponse;
import com.ssafy.srank.quest.application.service.MainQuestService;
import com.ssafy.srank.quest.application.service.QuestFacadeService;
import com.ssafy.srank.quest.application.service.SubQuestService;
import com.ssafy.srank.quest.domain.entity.QuestType;
import com.ssafy.srank.security.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
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
    private final QuestFacadeService service;

    @GetMapping("/main")
    public ResponseEntity<ApiResponse<List<MainQuestResponse>>> getMainQuests() {
        return ResponseEntity.ok(ApiResponse.success(mainQuestService.getMainQuestList(SecurityUtil.getCurrentUserId())));
    }

    @GetMapping("/sub")
    public ResponseEntity<ApiResponse<List<SubQuestResponse>>> getSubQuests() {
        return ResponseEntity.ok(ApiResponse.success(subQuestService.getSubQuests(SecurityUtil.getCurrentUserId())));
    }

    @GetMapping("/{questId}")
    public ResponseEntity<ApiResponse<QuestDetailResponse>> getQuestDetail(
            @PathVariable Long questId,
            @RequestParam String type
    ) {
        Long userId = SecurityUtil.getCurrentUserId();
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

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<InProcessQuestResponse>>> getInProcessQuest(){
        return ResponseEntity.ok(ApiResponse.success(service.getInProcessQuestList(SecurityUtil.getCurrentUserId())));
    }

    @PostMapping("/main/{questId}/start")
    public ResponseEntity<ApiResponse<Void>> startMainQuest(
            @PathVariable Long questId,
            @RequestBody MainQuestRequest request
            ){
        Long userId = SecurityUtil.getCurrentUserId();
        service.startMainQuest(userId,questId, request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/sub/{questId}/start")
    public ResponseEntity<ApiResponse<Void>> startSubQuest(
            @PathVariable Long questId,
            @RequestBody SubQuestRequest request
    ){
        Long userId = SecurityUtil.getCurrentUserId();
        service.startSubQuest(userId,questId, request);
        return ResponseEntity.ok(ApiResponse.success());
    }


    @Operation(summary = "퀘스트 보상 수령", description = "퀘스트 완료 후 보상을 수령합니다.")
    @PostMapping("/complete")
    public ResponseEntity<ApiResponse<Void>> claimReward(
            @RequestBody CompleteQuestRequest request
            ){
        service.claimReward(SecurityUtil.getCurrentUserId(), request);
        return ResponseEntity.ok(ApiResponse.success());
    }
}