package com.ssafy.srank.mission.application.dto.response;

import com.ssafy.srank.mission.domain.entity.MissionTemplate;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class MissionRewardClaimResponse {

    private Long missionId;
    private String name;
    private int rewardToken;
    private LocalDate claimedDate;
    private LocalDateTime claimedAt;

    public static MissionRewardClaimResponse of(
            MissionTemplate missionTemplate,
            LocalDate claimedDate,
            LocalDateTime claimedAt
    ) {
        return new MissionRewardClaimResponse(
                missionTemplate.getId(),
                missionTemplate.getName(),
                missionTemplate.getRewardToken(),
                claimedDate,
                claimedAt
        );
    }
}
