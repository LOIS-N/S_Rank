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

    @PostMapping("/draws")
    public ResponseEntity<ApiResponse<GachaDrawResponse>> draw(@Valid @RequestBody GachaDrawRequest request) {
        return ResponseEntity.ok(ApiResponse.success(gachaService.draw(SecurityUtil.getCurrentUserId(), request)));
    }
}
