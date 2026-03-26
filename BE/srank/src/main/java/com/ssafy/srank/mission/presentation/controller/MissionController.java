package com.ssafy.srank.mission.presentation.controller;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.mission.application.dto.response.DailyMissionStatusResponse;
import com.ssafy.srank.mission.application.dto.response.MissionRewardClaimResponse;
import com.ssafy.srank.mission.application.service.MissionService;
import com.ssafy.srank.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/missions")
@RequiredArgsConstructor
public class MissionController {

    private final MissionService missionService;

    @GetMapping("/daily")
    public ResponseEntity<ApiResponse<DailyMissionStatusResponse>> getDailyMissions() {
        return ResponseEntity.ok(ApiResponse.success(
                missionService.getTodayMissions(SecurityUtil.getCurrentUserId())
        ));
    }

    @PostMapping("/daily/{missionId}/claim")
    public ResponseEntity<ApiResponse<MissionRewardClaimResponse>> claimDailyMissionReward(
            @PathVariable Long missionId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                missionService.claimTodayMissionReward(SecurityUtil.getCurrentUserId(), missionId)
        ));
    }
}
