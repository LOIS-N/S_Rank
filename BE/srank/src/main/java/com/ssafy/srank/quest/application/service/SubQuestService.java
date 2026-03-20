package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.application.dto.response.SubQuestResponse;

import java.util.List;

public interface SubQuestService {
    List<SubQuestResponse> getSubQuests(Long userId);
    QuestDetailResponse getSubQuestDetail(Long userId, Long questId);
    QuestDetailResponse getUserSubQuestDetail(Long userId, Long questId);
}
