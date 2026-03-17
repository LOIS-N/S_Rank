package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.application.dto.response.MainQuestResponse;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;

import java.util.List;

public interface MainQuestService {
    List<MainQuestResponse> getMainQuestList(Long userId);
    QuestDetailResponse getMainQuestDetail(Long userId, Long questId);
    QuestDetailResponse getUserMainQuestDetail(Long userId, Long questId);
}
