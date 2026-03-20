package com.ssafy.srank.sse.application.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SseService {

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter connect(Long userId) {
        SseEmitter emitter = new SseEmitter(60L * 60 * 1000); // 1시간
        emitters.put(userId, emitter);

        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(() -> emitters.remove(userId));
        emitter.onError((e) -> emitters.remove(userId));

        try {
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data("SSE connected"));
        } catch (IOException e) {
            emitters.remove(userId);
        }

        return emitter;
    }

    public void sendToUser(Long userId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) {
            return;
        }

        try {
            emitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(data));
        } catch (IOException e) {
            emitters.remove(userId);
        }
    }

    @Scheduled(fixedRate = 30000)
    public void sendHeartbeat() {
        for (Map.Entry<Long, SseEmitter> entry : emitters.entrySet()) {
            try {
                entry.getValue().send(
                        SseEmitter.event()
                                .name("heartbeat")
                                .data("ping")
                );
            } catch (IOException e) {
                emitters.remove(entry.getKey());
            }
        }
    }
}