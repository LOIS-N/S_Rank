package com.ssafy.srank.quest.application.dto.response;

import com.ssafy.srank.quest.domain.entity.SubQuestTemplate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SubQuestResponse {

    private Long questId;
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

    private boolean isInProgress;

    public static SubQuestResponse from(SubQuestTemplate template, boolean isInProgress) {
        return SubQuestResponse.builder()
                .questId(template.getId())
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
                .isInProgress(isInProgress)
                .build();
    }
}
