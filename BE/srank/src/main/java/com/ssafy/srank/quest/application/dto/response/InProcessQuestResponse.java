package com.ssafy.srank.quest.application.dto.response;

import com.ssafy.srank.quest.domain.entity.QuestType;
import com.ssafy.srank.quest.domain.entity.UserDeskQuest;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.ToString;

@Getter
@AllArgsConstructor
@Builder
@ToString
public class InProcessQuestResponse {
    private Long deskId;
    private Long questId;
    private QuestType questType;
    private String title;
    private int difficulty;
    private int rewardGold;

    public static InProcessQuestResponse from(UserDeskQuest quest, QuestDetailResponse detail){
        return InProcessQuestResponse.builder()
                .deskId(quest.getUserDeskId())
                .questId(quest.getQuestId())
                .questType(quest.getQuestType())
                .difficulty(detail.getDifficulty())
                .rewardGold(detail.getRewardGold())
                .build();
    }
}
