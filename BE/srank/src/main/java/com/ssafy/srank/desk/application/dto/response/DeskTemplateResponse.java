package com.ssafy.srank.desk.application.dto.response;

import com.ssafy.srank.desk.domain.entity.DeskTemplate;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeskTemplateResponse {

    private Long deskTemplateId;
    private String image;
    private int unlockCostGold;
    private int requiredLevel;
    private boolean isUnlocked;

    public static DeskTemplateResponse from(DeskTemplate template, boolean isUnlocked) {
        return DeskTemplateResponse.builder()
                .deskTemplateId(template.getId())
                .image(template.getImage())
                .unlockCostGold(template.getUnlockCostGold())
                .requiredLevel(template.getRequiredLevel())
                .isUnlocked(isUnlocked)
                .build();
    }
}
