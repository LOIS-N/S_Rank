package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.quest.application.dto.request.CompleteQuestRequest;
import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;

import java.util.List;

public interface QuestFacadeService {
    List<InProcessQuestResponse> getInProcessQuestList(Long userId);
    Long startMainQuest(Long userId, Long questId, MainQuestRequest request);
    Long startSubQuest(Long userId, Long questId, SubQuestRequest request);
    void claimReward(Long userId, CompleteQuestRequest request);
    List<Long> getUsedUserCardList(Long userId);
    void completeQuest(Long userId, Long questId, String type);
}
