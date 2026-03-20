package com.ssafy.srank.quest.application.listener;

import com.ssafy.srank.quest.application.service.QuestFacadeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisKeyExpiredEvent;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
@Slf4j
public class RedisExpirationSubscriber {
    private final QuestFacadeService questService;

    @EventListener
    public void handleExpired(RedisKeyExpiredEvent<String> event) {
        Object source = event.getSource();

        String key;
        if (source instanceof byte[] bytes) {
            key = new String(bytes, StandardCharsets.UTF_8);
        } else {
            key = source.toString();
        }
        if (key == null || !key.startsWith("quest:")) {
            return;
        }

        String[] parts = key.split(":");
        if (parts.length != 4) {
            return;
        }

        Long userId = Long.parseLong(parts[1]);
        Long questId = Long.parseLong(parts[2]);
        String questType = parts[3];

        questService.completeQuest(userId, questId, questType);
    }
}
