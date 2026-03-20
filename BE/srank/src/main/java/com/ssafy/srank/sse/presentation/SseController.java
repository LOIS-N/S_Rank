package com.ssafy.srank.sse.presentation;

import com.ssafy.srank.security.SecurityUtil;
import com.ssafy.srank.sse.application.service.SseService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class SseController {

    private final SseService sseService;

    @GetMapping(value = "/connect", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter connect(HttpServletResponse response) {
        // nginx 프록시 버퍼링 비활성화 — 없으면 nginx가 SSE 응답을 쌓아두고 클라이언트에 즉시 전달하지 않음
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");
        Long userId = SecurityUtil.getCurrentUserId();
        return sseService.connect(userId);
    }
}