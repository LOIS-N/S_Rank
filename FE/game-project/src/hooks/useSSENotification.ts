"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";

const SSE_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/notifications/connect`;
const SSE_EVENT_QUEST_COMPLETE = "quest-complete";
const RECONNECT_DELAY_MS = 3000;

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
 * - 연결 끊김 시 3초 후 자동 재연결
 * - 브라우저 알림 권한 없을 때 인앱 알림으로 fallback
 */
export function useSSENotification(accessToken: string | null) {
  const abortRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isAuthenticated } = useUserStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    let active = true;

    const clearRetry = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    async function connect() {
      clearRetry();

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(SSE_ENDPOINT, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          console.warn("[SSE] 연결 실패:", response.status);
          scheduleReconnect();
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

            if (eventName === SSE_EVENT_QUEST_COMPLETE) {
              const payload = parseSSEPayload(data);

              // 1) questId 매칭으로 COMPLETED 전환
              if (payload.questId != null) {
                useGameStore.getState().finishQuestByQuestId(payload.questId);
              }
              // 2) fallback: 만료된 IN_PROGRESS 퀘스트 전체 스윕
              const now = Date.now();
              useGameStore.getState().quests.forEach(q => {
                if (q.status === 'IN_PROGRESS') {
                  const endTime = q.endAt ? new Date(q.endAt).getTime() : (q.endTime || 0);
                  if (endTime <= now) {
                    useGameStore.getState().finishQuestTimer(q.id);
                  }
                }
              });

              const nickname = useGameStore.getState().nickname;
              const title = "S급 개발자들이 나를 따르는 이유";
              const body = payload.message ?? `${nickname || "개발자"}님, 프로젝트가 완수됐어요! 지금 바로 보상을 수령하세요!`;

              if (Notification.permission === "granted") {
                showWebNotification(title, body);
              } else {
                useGameStore.getState().pushNotification(title, body);
              }
            }
          }
        }

        // 스트림 정상 종료 → 재연결
        scheduleReconnect();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.warn("[SSE] 연결 오류:", err);
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      if (!active) return;
      console.log(`[SSE] ${RECONNECT_DELAY_MS / 1000}초 후 재연결 시도...`);
      retryTimerRef.current = setTimeout(() => {
        if (active) connect();
      }, RECONNECT_DELAY_MS);
    }

    connect();

    return () => {
      active = false;
      clearRetry();
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [isAuthenticated, accessToken]);
}
