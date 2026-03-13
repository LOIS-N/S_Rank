package com.ssafy.srank.auth.presentation.controller;

import com.ssafy.srank.auth.application.dto.request.LoginRequest;
import com.ssafy.srank.auth.application.dto.request.SignupRequest;
import com.ssafy.srank.auth.application.dto.response.AuthResult;
import com.ssafy.srank.auth.application.dto.response.LoginResponse;
import com.ssafy.srank.auth.application.dto.response.RefreshResponse;
import com.ssafy.srank.auth.application.dto.response.SignupResponse;
import com.ssafy.srank.auth.application.service.AuthService;
import com.ssafy.srank.auth.jwt.RefreshTokenCookieManager;
import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieManager refreshTokenCookieManager;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpServletRequest) {
        AuthResult<LoginResponse> result = authService.login(request, httpServletRequest.getHeader(HttpHeaders.USER_AGENT), httpServletRequest.getRemoteAddr());
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (result.refreshToken() != null) {
            builder.header(HttpHeaders.SET_COOKIE, refreshTokenCookieManager.createSetCookieHeader(result.refreshToken()));
        }
        String message = Boolean.TRUE.equals(result.body().isNewUser()) ? "추가 회원 정보 입력이 필요합니다." : "로그인에 성공했습니다.";
        return builder.body(ApiResponse.success(HttpStatus.OK, message, result.body()));
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<SignupResponse>> signup(@Valid @RequestBody SignupRequest request, HttpServletRequest httpServletRequest) {
        AuthResult<SignupResponse> result = authService.signup(request, httpServletRequest.getHeader(HttpHeaders.USER_AGENT), httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieManager.createSetCookieHeader(result.refreshToken()))
                .body(ApiResponse.success(HttpStatus.OK, "회원가입이 완료되었습니다.", result.body()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<RefreshResponse>> refresh(HttpServletRequest httpServletRequest) {
        AuthResult<RefreshResponse> result = authService.refresh(refreshTokenCookieManager.extract(httpServletRequest));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieManager.createSetCookieHeader(result.refreshToken()))
                .body(ApiResponse.success(HttpStatus.OK, "토큰이 재발급되었습니다.", result.body()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        authService.logout(authenticatedUser);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieManager.createDeleteCookieHeader())
                .body(ApiResponse.success(HttpStatus.OK, "로그아웃되었습니다."));
    }
}
