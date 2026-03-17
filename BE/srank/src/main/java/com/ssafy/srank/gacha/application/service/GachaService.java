package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.gacha.application.dto.request.GachaDrawRequest;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawResponse;

public interface GachaService {

    GachaDrawResponse draw(Long userId, GachaDrawRequest request);
}
