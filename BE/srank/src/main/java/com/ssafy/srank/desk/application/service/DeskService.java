package com.ssafy.srank.desk.application.service;

import com.ssafy.srank.desk.application.dto.response.DeskTemplateResponse;

import java.util.List;

public interface DeskService {
    List<DeskTemplateResponse> getDeskTemplateList(Long userId);
    void unlockDesk(Long userId, Long deskTemplateId);
}
