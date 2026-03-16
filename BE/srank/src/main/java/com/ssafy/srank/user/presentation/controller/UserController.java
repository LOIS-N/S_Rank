package com.ssafy.srank.user.presentation.controller;

import com.ssafy.srank.auth.jwt.RefreshTokenCookieManager;
import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.security.AuthenticatedUser;
import com.ssafy.srank.user.application.dto.request.UpdateNicknameRequest;
import com.ssafy.srank.user.application.dto.request.WithdrawRequest;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;
import com.ssafy.srank.user.application.dto.response.UpdateNicknameResponse;
import com.ssafy.srank.user.application.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final RefreshTokenCookieManager refreshTokenCookieManager;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MyInfoResponse>> getMyInfo(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "내 정보를 조회했습니다.", userService.getMyInfo(authenticatedUser.userId())));
    }

    @PutMapping("/me/nickname")
    public ResponseEntity<ApiResponse<UpdateNicknameResponse>> updateNickname(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody UpdateNicknameRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "닉네임이 수정되었습니다.", userService.updateNickname(authenticatedUser.userId(), request.nickname())));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> withdraw(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @RequestBody(required = false) WithdrawRequest request
    ) {
        userService.withdraw(authenticatedUser.userId(), request == null ? null : request.reason());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieManager.createDeleteCookieHeader())
                .body(ApiResponse.success(HttpStatus.OK, "회원 탈퇴가 완료되었습니다."));
    }
}
