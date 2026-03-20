package com.ssafy.srank.user.presentation.controller;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.security.SecurityUtil;
import com.ssafy.srank.user.application.dto.request.UpdateNicknameRequest;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;
import com.ssafy.srank.user.application.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MyInfoResponse>> getMyInfo() {
        return ResponseEntity.ok(ApiResponse.success(userService.getMyInfo(SecurityUtil.getCurrentUserId())));
    }

    @PutMapping("/me/nickname")
    public ResponseEntity<ApiResponse<Void>> updateNickname(@Valid @RequestBody UpdateNicknameRequest request) {
        userService.updateNickname(SecurityUtil.getCurrentUserId(), request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> withdraw() {
        userService.withdraw(SecurityUtil.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
