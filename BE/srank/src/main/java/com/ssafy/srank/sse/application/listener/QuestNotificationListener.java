package com.ssafy.srank.sse.application.listener;

import com.ssafy.srank.sse.application.dto.QuestCompleteResponse;
import com.ssafy.srank.sse.application.event.QuestCompletedEvent;
import com.ssafy.srank.sse.application.service.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class QuestNotificationListener {

    private final SseService sseService;

    @EventListener
    public void handleQuestCompleted(QuestCompletedEvent event) {
        sseService.sendToUser(
                event.userId(),
                "quest-complete",
                new QuestCompleteResponse(
                        event.questId(),
                        event.questType(),
                        event.message()
                )
        );
    }
}