package com.ssafy.srank.gacha.presentation.controller;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.gacha.application.dto.request.GachaDrawRequest;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawResponse;
import com.ssafy.srank.gacha.application.service.GachaService;
import com.ssafy.srank.security.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/gacha")
@RequiredArgsConstructor
public class GachaController {

    private final GachaService gachaService;

    /**
     * 가챠 API는 "이번 요청으로 실제로 뽑힌 카드들"을 즉시 반환한다.
     * 카드 목록 조회 API와 달리 cursor/hasMore를 만드는 역할은 하지 않는다.
     */
    @PostMapping("/draws")
    public ResponseEntity<ApiResponse<GachaDrawResponse>> draw(@Valid @RequestBody GachaDrawRequest request) {
        return ResponseEntity.ok(ApiResponse.success(gachaService.draw(SecurityUtil.getCurrentUserId(), request)));
    }
}
