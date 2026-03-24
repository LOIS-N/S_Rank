package com.ssafy.srank.user.presentation.controller;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.security.SecurityUtil;
import com.ssafy.srank.user.application.dto.request.GoldBugRequest;
import com.ssafy.srank.user.application.dto.request.UpdateNicknameRequest;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;
import com.ssafy.srank.user.application.service.UserService;
import com.ssafy.srank.user.domain.entity.GoldBugType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/goldbug")
    public ResponseEntity<ApiResponse<Long>> catchGoldBug(@RequestBody GoldBugRequest request){
        long gold = request.type().equals(GoldBugType.NORMAL) ? GoldBugType.NORMAL.getGoldReward() : GoldBugType.GOLDEN.getGoldReward();
        return ResponseEntity.ok(ApiResponse.success(userService.rewardGold(SecurityUtil.getCurrentUserId(),gold, GoldLogReason.CATCH_BUG )));
    }

}
