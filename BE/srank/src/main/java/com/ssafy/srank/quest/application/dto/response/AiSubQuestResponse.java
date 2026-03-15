package com.ssafy.srank.quest.application.dto.response;

import com.ssafy.srank.quest.domain.entity.SubQuestTemplate;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
@Getter
@NoArgsConstructor
public class AiSubQuestResponse {

    private List<Choice> choices;

    @Getter
    @NoArgsConstructor
    public static class Choice {
        private Message message;
    }

    @Getter
    @NoArgsConstructor
    public static class Message {
        private String content;
    }

    @Getter
    @NoArgsConstructor
    public static class SubQuestContent {
        private String title;
        private String description;
        private int difficulty;
        private int durationMinutes;
        private int rewardGold;
        private List<RequiredSkill> requiredSkills;

        public SubQuestTemplate toEntity() {
            return SubQuestTemplate.builder()
                    .title(this.title)
                    .description(this.description)
                    .difficulty(this.difficulty)
                    .requiredSkillType1(this.requiredSkills.get(0).getSkillType())
                    .requiredSkillValue1(this.requiredSkills.get(0).getSkillValue())
                    .requiredSkillType2(this.requiredSkills.get(1).getSkillType())
                    .requiredSkillValue2(this.requiredSkills.get(1).getSkillValue())
                    .requiredSkillType3(this.requiredSkills.get(2).getSkillType())
                    .requiredSkillValue3(this.requiredSkills.get(2).getSkillValue())
                    .durationMinutes(this.durationMinutes)
                    .cardSlotCount(this.requiredSkills.size())
                    .rewardGold(this.rewardGold)
                    .questDate(LocalDateTime.now())
                    .build();
        }
    }

    @Getter
    @NoArgsConstructor
    public static class RequiredSkill {
        private String skillType;
        private int skillValue;
    }

    @Getter
    @NoArgsConstructor
    public static class SubQuestListContent {
        private List<SubQuestContent> quests;
    }

    public String getContent() {
        return choices.get(0).getMessage().getContent();
    }
}