package com.ssafy.srank.sse.application.event;

public record RewardCompleteResponse(
        Long cost,
        String message
) {}
