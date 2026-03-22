package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.gacha.application.dto.request.GachaDrawRequest;
import com.ssafy.srank.gacha.application.dto.request.GachaVerificationRequest;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaVerificationResponse;

public interface GachaService {

    // userId 기준으로 뽑기를 수행하고, 생성된 카드들과 차감 골드를 한 번에 반환한다.
    GachaDrawResponse draw(Long userId, GachaDrawRequest request);

    GachaVerificationResponse verify(GachaVerificationRequest request);
}
