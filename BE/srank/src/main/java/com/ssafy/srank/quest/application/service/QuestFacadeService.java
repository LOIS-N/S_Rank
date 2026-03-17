package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;

import java.util.List;

public interface QuestFacadeService {
    List<InProcessQuestResponse> getInProcessQuestList(Long userId);
    void startMainQuest(Long userId, Long questId, MainQuestRequest request);
    void startSubQuest(Long userId, Long questId, SubQuestRequest request);
}
