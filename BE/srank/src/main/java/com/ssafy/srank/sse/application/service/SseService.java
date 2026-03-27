package com.ssafy.srank.sse.application.service;

import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.SseMetrics;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class SseService {

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final SseMetrics sseMetrics;

    @PostConstruct
    void bindMetrics() {
        sseMetrics.bindConnectionGauge(emitters::size);
    }

    public SseEmitter connect(Long userId) {
        log.debug("[SSE] connect request userId={} connections={}", userId, emitters.size());

        // 재연결 시 구 emitter를 먼저 맵에서 제거하고 complete() — 구 emitter의 콜백이
        // 나중에 실행되더라도 새 emitter를 건드리지 못하도록 선제 처리
        SseEmitter old = emitters.remove(userId);
        if (old != null) {
            try { old.complete(); } catch (Exception ignored) {}
        }

        SseEmitter emitter = new SseEmitter(60L * 60 * 1000);
        emitters.put(userId, emitter);
        sseMetrics.recordConnection("connect", MetricTagValues.RESULT_SUCCESS);

        // 콜백에서 remove(userId, emitter) 를 사용해 현재 등록된 emitter가 자신인 경우에만 제거
        emitter.onCompletion(() -> {
            emitters.remove(userId, emitter);
            sseMetrics.recordConnection("completion", MetricTagValues.RESULT_SUCCESS);
            log.debug("[SSE] completion userId={}", userId);
        });

        emitter.onTimeout(() -> {
            emitters.remove(userId, emitter);
            sseMetrics.recordConnection("timeout", MetricTagValues.RESULT_SUCCESS);
            log.debug("[SSE] timeout userId={}", userId);
        });

        emitter.onError(e -> {
            emitters.remove(userId, emitter);
            sseMetrics.recordConnection("error", MetricTagValues.RESULT_ERROR);
            log.debug("[SSE] error userId={} error={}", userId, e.getMessage());
        });

        long startNanos = System.nanoTime();
        try {
            emitter.send(SseEmitter.event().name("connect").data("SSE connected"));
            sseMetrics.recordSend("connect", MetricTagValues.RESULT_SUCCESS, System.nanoTime() - startNanos);
            log.debug("[SSE] initial connect event sent userId={}", userId);
        } catch (IOException e) {
            emitters.remove(userId, emitter);
            sseMetrics.recordSend("connect", MetricTagValues.RESULT_ERROR, System.nanoTime() - startNanos);
            log.warn("[SSE] initial connect event failed userId={} error={}", userId, e.getMessage());
        }

        return emitter;
    }

    public void sendToUser(Long userId, String eventName, Object data) {
        long startNanos = System.nanoTime();
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) {
            sseMetrics.recordSend(eventName, MetricTagValues.RESULT_IGNORED, System.nanoTime() - startNanos);
            log.warn("[SSE] missing emitter userId={} event={}", userId, eventName);
            return;
        }

        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
            sseMetrics.recordSend(eventName, MetricTagValues.RESULT_SUCCESS, System.nanoTime() - startNanos);
            log.debug("[SSE] event sent userId={} event={}", userId, eventName);
        } catch (IOException e) {
            emitters.remove(userId, emitter);
            sseMetrics.recordSend(eventName, MetricTagValues.RESULT_ERROR, System.nanoTime() - startNanos);
            log.warn("[SSE] event send failed userId={} event={} error={}", userId, eventName, e.getMessage());
        }
    }

    @Scheduled(fixedRate = 30000)
    public void sendHeartbeat() {
        for (Long userId : emitters.keySet()) {
            SseEmitter emitter = emitters.get(userId);
            if (emitter == null) {
                continue;
            }

            long startNanos = System.nanoTime();
            try {
                emitter.send(SseEmitter.event().name("heartbeat").data("ping"));
                sseMetrics.recordSend("heartbeat", MetricTagValues.RESULT_SUCCESS, System.nanoTime() - startNanos);
            } catch (IOException e) {
                emitters.remove(userId);
                sseMetrics.recordSend("heartbeat", MetricTagValues.RESULT_ERROR, System.nanoTime() - startNanos);
                log.warn("[SSE] heartbeat failed userId={} error={}", userId, e.getMessage());
            }
        }
    }
}
