package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.application.dto.response.SubQuestResponse;
import com.ssafy.srank.quest.domain.entity.UserSubQuest;

import java.util.List;

public interface SubQuestService {

    //사용자가 진행중인 서브 퀘스트 조회(완료 포함)
    List<InProcessQuestResponse> getUserSubQuestList(Long userId);
    UserSubQuest startSubQuest(Long userId, Long questTemplateId, SubQuestRequest request);
    Long claimRewardSubQuest(Long userId, Long questId);
    void completeSubQuest(Long userId, Long questId);

    List<SubQuestResponse> getSubQuests(Long userId);
    QuestDetailResponse getSubQuestDetail(Long userId, Long questId);
    QuestDetailResponse getUserSubQuestDetail(Long userId, Long questId);
}
