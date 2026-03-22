package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.application.dto.response.MainQuestResponse;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;

import java.util.List;

public interface MainQuestService {
    List<MainQuestResponse> getMainQuestList(Long userId);
    QuestDetailResponse getMainQuestDetail(Long userId, Long questId);
    QuestDetailResponse getUserMainQuestDetail(Long userId, Long questId);

    //사용자가 진행중인 메인 퀘스트 조회(완료 포함)
    List<InProcessQuestResponse> getUserMainQuestList(Long userId);
    //메인 퀘스트 시작
    UserMainQuest startMainQuest(Long userId, Long questId, MainQuestRequest request);
    //보상
    Long claimRewardMainQuest(Long userId, Long questId);
    //퀘스트 완료 상태 변경
    void completeMainQuest(Long userId, Long questId);
}
