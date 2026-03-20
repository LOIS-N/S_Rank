package com.ssafy.srank.sse.application.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class SseService {

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter connect(Long userId) {
        log.debug("[SSE] 연결 요청 - userId={}, 현재 연결 수={}", userId, emitters.size());

        SseEmitter emitter = new SseEmitter(60L * 60 * 1000); // 1시간
        emitters.put(userId, emitter);

        // 연결 종료 콜백
        emitter.onCompletion(() -> {
            emitters.remove(userId);
            log.debug("[SSE] 연결 완료(onCompletion) - userId={}", userId);
        });

        // 타임아웃 콜백
        emitter.onTimeout(() -> {
            emitters.remove(userId);
            log.debug("[SSE] 연결 타임아웃(onTimeout) - userId={}", userId);
        });

        // 에러 콜백
        emitter.onError((e) -> {
            emitters.remove(userId);
            log.debug("[SSE] 연결 에러(onError) - userId={}, error={}", userId, e.getMessage());
        });

        try {
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data("SSE connected"));
            log.debug("[SSE] 초기 connect 이벤트 전송 완료 - userId={}, 현재 연결 수={}", userId, emitters.size());
        } catch (IOException e) {
            emitters.remove(userId);
            log.warn("[SSE] 초기 connect 이벤트 전송 실패 - userId={}, error={}", userId, e.getMessage());
        }

        return emitter;
    }

    public void sendToUser(Long userId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) {
            // 연결되지 않은 유저에게 이벤트 전송 시도 (정상 케이스일 수 있으나 추적용으로 WARN)
            log.warn("[SSE] 전송 대상 emitter 없음 (미연결 유저) - userId={}, eventName={}", userId, eventName);
            return;
        }

        log.debug("[SSE] 이벤트 전송 시도 - userId={}, eventName={}", userId, eventName);

        try {
            emitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(data));
            log.debug("[SSE] 이벤트 전송 완료 - userId={}, eventName={}", userId, eventName);
        } catch (IOException e) {
            emitters.remove(userId);
            log.warn("[SSE] 이벤트 전송 실패, emitter 제거 - userId={}, eventName={}, error={}", userId, eventName, e.getMessage());
        }
    }

    @Scheduled(fixedRate = 30000)
    public void sendHeartbeat() {
        log.debug("[SSE] Heartbeat 전송 시작 - 대상 수={}", emitters.size());

        // keySet() 복사 후 순회 — 전송 실패 시 emitters에서 제거해도 순회에 영향 없음
        for (Long userId : emitters.keySet()) {
            SseEmitter emitter = emitters.get(userId);
            if (emitter == null) continue;
            try {
                emitter.send(
                        SseEmitter.event()
                                .name("heartbeat")
                                .data("ping")
                );
            } catch (IOException e) {
                emitters.remove(userId);
                log.warn("[SSE] Heartbeat 전송 실패, emitter 제거 - userId={}, error={}", userId, e.getMessage());
            }
        }
    }
}
