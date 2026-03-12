package com.ssafy.srank.quest.presentation.controller;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.quest.application.dto.response.MainQuestResponse;
import com.ssafy.srank.quest.application.dto.response.SubQuestResponse;
import com.ssafy.srank.quest.application.service.MainQuestService;
import com.ssafy.srank.quest.application.service.SubQuestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Quest", description = "퀘스트 API")
@RestController
@RequestMapping("/api/v1/quests")
@RequiredArgsConstructor
public class QuestController {

    private final MainQuestService mainQuestService;
    private final SubQuestService subQuestService;

    @Operation(
            summary = "현재 챕터 메인 퀘스트 목록 조회",
            description = "유저의 현재 챕터에 해당하는 메인 퀘스트 전체 목록을 반환합니다. " +
                    "각 스텝의 완료 여부(isCompleted)와 진행 중 여부(isInProgress)를 포함합니다."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "조회 성공",
                    content = @Content(schema = @Schema(implementation = MainQuestResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401", description = "AU001 - 인증되지 않은 사용자", content = @Content
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Q001 - 퀘스트를 찾을 수 없음", content = @Content
            )
    })
    @GetMapping("/main")
    public ResponseEntity<ApiResponse<List<MainQuestResponse>>> getMainQuests(
            // TODO: Spring Security 적용 후 @AuthenticationPrincipal로 교체
            @Parameter(description = "유저 ID (임시)", example = "1")
            @RequestHeader("X-User-Id") Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.success(mainQuestService.getMainQuests(userId)));
    }

    @Operation(
            summary = "서브 퀘스트 목록 조회",
            description = "당일 생성된 서브 퀘스트를 난이도별 최대 5개씩 반환합니다. " +
                    "새로고침 시 동일 API를 재호출합니다. " +
                    "진행 중 여부(isInProgress)를 포함합니다."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "조회 성공",
                    content = @Content(schema = @Schema(implementation = SubQuestResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401", description = "AU001 - 인증되지 않은 사용자", content = @Content
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Q001 - 당일 서브 퀘스트 없음", content = @Content
            )
    })
    @GetMapping("/sub")
    public ResponseEntity<ApiResponse<List<SubQuestResponse>>> getSubQuests(
            @Parameter(description = "유저 ID (임시)", example = "1")
            @RequestHeader("X-User-Id") Long userId
    ) {
        return ResponseEntity.ok(ApiResponse.success(subQuestService.getSubQuests(userId)));
    }
}
