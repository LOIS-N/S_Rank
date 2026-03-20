"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";

const SSE_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/notifications/connect`;

const SSE_EVENT_QUEST_COMPLETE = "quest-complete";

/** BE SSE 페이로드 구조 */
interface QuestCompletePayload {
  questId?: number;
  questType?: string;
  message?: string;
}

function parseSSEPayload(raw: string): QuestCompletePayload {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** 브라우저 Web Notification 표시 */
function showWebNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification(title, {
    body,
    icon: `${process.env.NEXT_PUBLIC_API_URL}/assets/icons/icon-192.webp`,
    badge: `${process.env.NEXT_PUBLIC_API_URL}/assets/icons/icon-192.webp`,
  });
}

/** 알림 권한 요청 (최초 1회, 로그인 후 호출) */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
}

/**
 * SSE 알림 훅 — fetch + ReadableStream으로 Authorization 헤더 전송
 * BE 엔드포인트: GET /api/v1/notifications/connect
 */
export function useSSENotification(accessToken: string | null) {
  const abortRef = useRef<AbortController | null>(null);
  const { isAuthenticated } = useUserStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const controller = new AbortController();
    abortRef.current = controller;

    async function connect() {
      try {
        const response = await fetch(SSE_ENDPOINT, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          console.warn("[SSE] 연결 실패:", response.status);
          return;
        }

        console.log("[SSE] 연결 성공");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          console.log("[SSE] 청크 수신:", JSON.stringify(chunk));
          buffer += chunk;
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.trim()) continue;
            let eventName = "message";
            let data = "";
            for (const line of part.split("\n")) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              else if (line.startsWith("data:")) data = line.slice(5).trim();
            }
            console.log("[SSE] 이벤트:", eventName, "| data:", data);

            if (eventName === SSE_EVENT_QUEST_COMPLETE) {
              const payload = parseSSEPayload(data);
              const nickname = useGameStore.getState().nickname;
              const body = payload.message ?? `${nickname || "개발자"}님, 프로젝트가 완수됐어요! 지금 바로 보상을 수령하세요!`;

              if (Notification.permission === "granted") {
                showWebNotification("S급 개발자들이 나를 따르는 이유", body);
              } else {
                console.info("[SSE] 알림 권한 없음, 인앱 fallback:", body);
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.warn("[SSE] 연결 오류:", err);
      }
    }

    connect();

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [isAuthenticated, accessToken]);
}