package com.ssafy.srank.mission.application.service;

import com.ssafy.srank.mission.application.dto.response.DailyMissionStatusResponse;
import com.ssafy.srank.mission.application.dto.response.MissionRewardClaimResponse;
import com.ssafy.srank.mission.domain.enums.MissionCategory;

public interface MissionService {

    DailyMissionStatusResponse getTodayMissions(Long userId);

    MissionRewardClaimResponse claimTodayMissionReward(Long userId, Long missionId);

    void recordActivity(Long userId, MissionCategory category, int count);
}
