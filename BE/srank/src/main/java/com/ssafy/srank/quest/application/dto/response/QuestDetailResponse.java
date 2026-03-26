package com.ssafy.srank.quest.application.dto.response;

import com.ssafy.srank.quest.domain.entity.MainQuestTemplate;
import com.ssafy.srank.quest.domain.entity.SubQuestTemplate;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import com.ssafy.srank.quest.domain.entity.UserSubQuest;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class QuestDetailResponse {

    private Long questId;
    private String questType;
    private Integer chapterNo;
    private Integer stepNo;
    private String title;
    private String description;
    private int difficulty;

    private String requiredSkillType1;
    private int requiredSkillValue1;
    private String requiredSkillType2;
    private int requiredSkillValue2;
    private String requiredSkillType3;
    private int requiredSkillValue3;

    private int durationMinutes;
    private int cardSlotCount;
    private int rewardGold;

    private LocalDateTime startedAt;
    private LocalDateTime endAt;

    private String status;

    public static QuestDetailResponse fromMain(MainQuestTemplate template, String status) {
        return QuestDetailResponse.builder()
                .questId(template.getId())
                .questType("MAIN")
                .chapterNo(template.getChapterNo())
                .stepNo(template.getStepNo())
                .title(template.getTitle())
                .description(template.getDescription())
                .difficulty(template.getDifficulty())
                .requiredSkillType1(template.getRequiredSkillType1())
                .requiredSkillValue1(template.getRequiredSkillValue1())
                .requiredSkillType2(template.getRequiredSkillType2())
                .requiredSkillValue2(template.getRequiredSkillValue2())
                .requiredSkillType3(template.getRequiredSkillType3())
                .requiredSkillValue3(template.getRequiredSkillValue3())
                .durationMinutes(template.getDurationMinutes())
                .cardSlotCount(template.getCardSlotCount())
                .rewardGold(template.getRewardGold())
                .status(status)
                .build();
    }

    public static QuestDetailResponse fromSub(SubQuestTemplate template, String status) {
        return QuestDetailResponse.builder()
                .questId(template.getId())
                .questType("SUB")
                .chapterNo(null)
                .stepNo(null)
                .title(template.getTitle())
                .description(template.getDescription())
                .difficulty(template.getDifficulty())
                .requiredSkillType1(template.getRequiredSkillType1())
                .requiredSkillValue1(template.getRequiredSkillValue1())
                .requiredSkillType2(template.getRequiredSkillType2())
                .requiredSkillValue2(template.getRequiredSkillValue2())
                .requiredSkillType3(template.getRequiredSkillType3())
                .requiredSkillValue3(template.getRequiredSkillValue3())
                .durationMinutes(template.getDurationMinutes())
                .cardSlotCount(template.getCardSlotCount())
                .rewardGold(template.getRewardGold())
                .status(status)
                .build();
    }

    public static QuestDetailResponse userDetailMain(UserMainQuest quest){
        return QuestDetailResponse.builder()
                .title(quest.getMainQuestTemplate().getTitle())
                .rewardGold(quest.getMainQuestTemplate().getRewardGold())
                .status(String.valueOf(quest.getStatus()))
                .startedAt(quest.getStartedAt())
                .endAt(quest.getEndAt())
                .build();
    }

    public static QuestDetailResponse userDetailSub(UserSubQuest quest){
        return QuestDetailResponse.builder()
                .title(quest.getSubQuestTemplate().getTitle())
                .rewardGold(quest.getSubQuestTemplate().getRewardGold())
                .status(String.valueOf(quest.getStatus()))
                .startedAt(quest.getStartedAt())
                .endAt(quest.getEndAt())
                .build();
    }

}
