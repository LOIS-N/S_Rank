package com.ssafy.srank.mission.application.dto.response;

import com.ssafy.srank.mission.domain.entity.MissionTemplate;
import com.ssafy.srank.mission.domain.enums.MissionCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class DailyMissionItemResponse {

    private Long missionId;
    private String name;
    private MissionCategory category;
    private int requiredCount;
    private int rewardToken;
    private long currentCount;
    private boolean completed;
    private boolean rewardClaimed;

    public static DailyMissionItemResponse of(
            MissionTemplate missionTemplate,
            long currentCount,
            boolean rewardClaimed
    ) {
        return DailyMissionItemResponse.builder()
                .missionId(missionTemplate.getId())
                .name(missionTemplate.getName())
                .category(missionTemplate.getCategory())
                .requiredCount(missionTemplate.getRequiredCount())
                .rewardToken(missionTemplate.getRewardToken())
                .currentCount(currentCount)
                .completed(currentCount >= missionTemplate.getRequiredCount())
                .rewardClaimed(rewardClaimed)
                .build();
    }
}
