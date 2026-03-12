package com.ssafy.srank.quest.application.dto.response;

import com.ssafy.srank.quest.domain.entity.MainQuestTemplate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MainQuestResponse {

    private Long questId;
    private int chapterNo;
    private int stepNo;
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

    private boolean isCompleted;    // CLAIMED 상태
    private boolean isInProgress;   // IN_PROGRESS 상태

    public static MainQuestResponse from(MainQuestTemplate template, boolean isCompleted, boolean isInProgress) {
        return MainQuestResponse.builder()
                .questId(template.getId())
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
                .isCompleted(isCompleted)
                .isInProgress(isInProgress)
                .build();
    }
}
