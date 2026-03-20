package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.quest.application.dto.request.CompleteQuestRequest;
import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.domain.entity.QuestType;

import java.util.List;
import java.util.Set;

public interface QuestFacadeService {
    List<InProcessQuestResponse> getInProcessQuestList(Long userId);
    void startMainQuest(Long userId, Long questId, MainQuestRequest request);
    void startSubQuest(Long userId, Long questId, SubQuestRequest request);
    void claimReward(Long userId, CompleteQuestRequest request);
    Set<Long> getUsedUserCardList(Long userId);
    void completeQuest(Long userId, Long questId, String type);
}
