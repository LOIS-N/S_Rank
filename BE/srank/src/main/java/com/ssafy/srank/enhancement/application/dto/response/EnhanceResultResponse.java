package com.ssafy.srank.enhancement.application.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EnhanceResultResponse {

    private Long cardId;
    private boolean success;
    private int enhanceTryCount;
    private int enhanceSuccessCount;
    private int increasedValue;
}