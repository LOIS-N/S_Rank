package com.ssafy.srank.synthesis.presentation.controller;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.security.SecurityUtil;
import com.ssafy.srank.synthesis.application.dto.request.SynthesisAttemptRequest;
import com.ssafy.srank.synthesis.application.dto.request.SynthesisVerificationRequest;
import com.ssafy.srank.synthesis.application.dto.response.SynthesisAttemptResponse;
import com.ssafy.srank.synthesis.application.dto.response.SynthesisVerificationResponse;
import com.ssafy.srank.synthesis.application.service.SynthesisService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/synthesis")
@RequiredArgsConstructor
public class SynthesisController {

    private final SynthesisService synthesisService;

    @PostMapping("/attempt")
    public ResponseEntity<ApiResponse<SynthesisAttemptResponse>> attempt(@Valid @RequestBody SynthesisAttemptRequest request) {
        return ResponseEntity.ok(ApiResponse.success(synthesisService.attempt(SecurityUtil.getCurrentUserId(), request)));
    }

    @PostMapping("/verification")
    public ResponseEntity<ApiResponse<SynthesisVerificationResponse>> verify(@Valid @RequestBody SynthesisVerificationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(synthesisService.verify(request)));
    }
}
