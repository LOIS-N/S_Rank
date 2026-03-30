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
    private Long baseDurationSeconds;


    public static InProcessQuestResponse fromUserMainQuest(UserMainQuest quest, Long duration){
        return fromUserMainQuest(quest, duration, 100);
    }

    public static InProcessQuestResponse fromUserMainQuest(UserMainQuest quest, Long duration, int multiplier){
        int rewardGold = Math.round(quest.getMainQuestTemplate().getRewardGold() * multiplier / 100.0f);
        return InProcessQuestResponse.builder()
                .deskId(quest.getUserDeskId())
                .title(quest.getMainQuestTemplate().getTitle())
                .questId(quest.getId())
                .questType(QuestType.MAIN)
                .status(quest.getStatus())
                .difficulty(quest.getMainQuestTemplate().getDifficulty())
                .rewardGold(rewardGold)
                .startedAt(quest.getStartedAt())
                .endAt(quest.getEndAt())
                .baseDurationSeconds(duration)
                .build();
    }

    public static InProcessQuestResponse fromUserSubQuest(UserSubQuest quest, Long duration){
        return fromUserSubQuest(quest, duration, 100);
    }

    public static InProcessQuestResponse fromUserSubQuest(UserSubQuest quest, Long duration, int multiplier){
        int rewardGold = Math.round(quest.getSubQuestTemplate().getRewardGold() * multiplier / 100.0f);
        return InProcessQuestResponse.builder()
                .deskId(quest.getUserDeskId())
                .title(quest.getSubQuestTemplate().getTitle())
                .questId(quest.getId())
                .questType(QuestType.SUB)
                .status(quest.getStatus())
                .difficulty(quest.getSubQuestTemplate().getDifficulty())
                .rewardGold(rewardGold)
                .startedAt(quest.getStartedAt())
                .endAt(quest.getEndAt())
                .baseDurationSeconds(duration)
                .build();
    }
}
