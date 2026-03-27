package com.ssafy.srank.user.application.dto.request;

import com.ssafy.srank.user.domain.entity.GoldBugType;

public record GoldBugRequest (
    GoldBugType type
){}
