package com.ssafy.srank.auth.presentation.controller;

import com.ssafy.srank.auth.application.dto.request.LoginRequest;
import com.ssafy.srank.auth.application.dto.response.LoginResponse;
import com.ssafy.srank.auth.application.service.AuthService;
import com.ssafy.srank.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private static final String AUTH_LOGIN_TAG = "[AUTH][LOGIN]";

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader,
            @Valid @RequestBody LoginRequest request
    ) {
        log.info("{} stage=controller.received authHeaderPresent={} identityTokenPresent={}",
                AUTH_LOGIN_TAG,
                authorizationHeader != null && !authorizationHeader.isBlank(),
                request.getIdentityToken() != null && !request.getIdentityToken().isBlank());

        return ResponseEntity.ok(ApiResponse.success(authService.login(authorizationHeader, request)));
    }
}
