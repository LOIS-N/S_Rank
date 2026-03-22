package com.ssafy.srank.quest.application.dto.response;

import com.ssafy.srank.quest.domain.entity.QuestStatus;
import com.ssafy.srank.quest.domain.entity.QuestType;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import com.ssafy.srank.quest.domain.entity.UserSubQuest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.ToString;

import java.time.LocalDateTime;

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
    private QuestStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime endAt;


    public static InProcessQuestResponse fromUserMainQuest(UserMainQuest quest){
        return InProcessQuestResponse.builder()
                .deskId(quest.getUserDeskId())
                .title(quest.getMainQuestTemplate().getTitle())
                .questId(quest.getId())
                .questType(QuestType.MAIN)
                .status(quest.getStatus())
                .difficulty(quest.getMainQuestTemplate().getDifficulty())
                .rewardGold(quest.getMainQuestTemplate().getRewardGold())
                .startedAt(quest.getStartedAt())
                .endAt(quest.getEndAt())
                .build();
    }

    public static InProcessQuestResponse fromUserSubQuest(UserSubQuest quest){
        return InProcessQuestResponse.builder()
                .deskId(quest.getUserDeskId())
                .title(quest.getSubQuestTemplate().getTitle())
                .questId(quest.getId())
                .questType(QuestType.SUB)
                .status(quest.getStatus())
                .difficulty(quest.getSubQuestTemplate().getDifficulty())
                .rewardGold(quest.getSubQuestTemplate().getRewardGold())
                .startedAt(quest.getStartedAt())
                .endAt(quest.getEndAt())
                .build();
    }
}
