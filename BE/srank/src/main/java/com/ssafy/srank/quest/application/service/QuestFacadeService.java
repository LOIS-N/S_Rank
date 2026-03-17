package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;

import java.util.List;

public interface QuestFacadeService {
    List<InProcessQuestResponse> getInProcessQuestList(Long userId);
}
