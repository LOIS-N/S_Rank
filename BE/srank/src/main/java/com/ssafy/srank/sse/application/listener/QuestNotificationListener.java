package com.ssafy.srank.sse.application.listener;

import com.ssafy.srank.sse.application.dto.QuestCompleteResponse;
import com.ssafy.srank.sse.application.event.QuestCompletedEvent;
import com.ssafy.srank.sse.application.service.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class QuestNotificationListener {

    private final SseService sseService;

    /**
     * 퀘스트 완료 SSE 알림
     * AFTER_COMMIT 사용 이유: completeQuest()는 @Transactional 안에서 이벤트를 발행하므로
     * @EventListener를 쓰면 DB 커밋 전에 SSE가 전송됨 → 클라이언트가 알림 받고
     * 즉시 API 호출 시 아직 커밋 안 된 데이터를 읽을 수 있음
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
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