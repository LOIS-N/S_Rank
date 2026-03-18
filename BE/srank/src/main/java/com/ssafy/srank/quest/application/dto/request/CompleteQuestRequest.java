package com.ssafy.srank.quest.application.dto.request;

import com.ssafy.srank.quest.domain.entity.QuestType;

public record CompleteQuestRequest(
        Long questId,
        QuestType questType
) {
}
