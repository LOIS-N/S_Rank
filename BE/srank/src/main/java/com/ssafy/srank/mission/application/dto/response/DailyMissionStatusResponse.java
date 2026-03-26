package com.ssafy.srank.mission.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@AllArgsConstructor
public class DailyMissionStatusResponse {

    private LocalDate missionDate;
    private List<DailyMissionItemResponse> missions;
}
