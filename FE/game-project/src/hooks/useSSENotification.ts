"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";

const SSE_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/notifications/connect`;
const SSE_EVENT_QUEST_COMPLETE = "quest-complete";
const SSE_EVENT_MARKET_SELL_READY = "market.sell.ready";
const SSE_EVENT_MARKET_SELL_COMPLETED = "market.sell.completed";
const SSE_EVENT_MARKET_BUY_COMPLETED = "market.buy.completed";
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
async function showWebNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const options: NotificationOptions = {
    body,
    icon: "/assets/icons/icon-192.webp",
    badge: "/assets/icons/icon-192.webp",
  };

  // 안드로이드 Chrome은 Service Worker 경유 필수
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    } catch {
      // SW 실패 시 직접 생성으로 fallback
    }
  }
  new Notification(title, options);
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

      // 재연결 시 항상 store에서 최신 토큰 사용 (클로저 캡처값이 만료됐을 수 있음)
      const currentToken = useUserStore.getState().accessToken;
      if (!currentToken) {
        scheduleReconnect();
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(SSE_ENDPOINT, {
          headers: { Authorization: `Bearer ${currentToken}` },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          console.warn("[SSE] 연결 실패:", response.status);
          // 401이면 토큰 만료 — 더 긴 딜레이 후 재시도 (토큰 갱신 대기)
          scheduleReconnect(response.status === 401 ? 10000 : RECONNECT_DELAY_MS);
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

            // ── 마켓 이벤트 ──
            if (eventName === SSE_EVENT_MARKET_SELL_READY) {
              useGameStore.getState().triggerMarketRefresh();
              const title = "S급 개발자들이 나를 따르는 이유";
              const body = "카드 판매 등록이 완료되었습니다. 거래소에서 확인하세요.";
              if (Notification.permission === "granted") {
                await showWebNotification(title, body);
              } else {
                useGameStore.getState().pushNotification(title, body);
              }
            } else if (eventName === SSE_EVENT_MARKET_SELL_COMPLETED) {
              useGameStore.getState().triggerMarketRefresh();
              const title = "S급 개발자들이 나를 따르는 이유";
              const body = "카드가 판매되었습니다. 우편함에서 보상을 확인하세요.";
              if (Notification.permission === "granted") {
                await showWebNotification(title, body);
              } else {
                useGameStore.getState().pushNotification(title, body);
              }
            } else if (eventName === SSE_EVENT_MARKET_BUY_COMPLETED) {
              useGameStore.getState().triggerMarketRefresh();
              const title = "S급 개발자들이 나를 따르는 이유";
              const body = "카드 구매가 완료되었습니다. 카드 목록에서 확인하세요.";
              if (Notification.permission === "granted") {
                await showWebNotification(title, body);
              } else {
                useGameStore.getState().pushNotification(title, body);
              }
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

              // 튜토리얼 퀘스트 중에는 stepNo3 제외하고 알림 억제
              const tutorialStep = useGameStore.getState().tutorialQuestStep;
              if (tutorialStep !== null && tutorialStep !== 3) continue;

              const nickname = useGameStore.getState().nickname;
              const title = "S급 개발자들이 나를 따르는 이유";
              const body = payload.message ?? `${nickname || "개발자"}님, 프로젝트가 완수됐어요! 지금 바로 보상을 수령하세요!`;

              if (Notification.permission === "granted") {
                await showWebNotification(title, body);
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

    function scheduleReconnect(delay = RECONNECT_DELAY_MS) {
      if (!active) return;
      console.log(`[SSE] ${delay / 1000}초 후 재연결 시도...`);
      retryTimerRef.current = setTimeout(() => {
        if (active) connect();
      }, delay);
    }

    connect();

    // 탭이 포그라운드로 돌아올 때 재연결 시도
    // abort 후 짧은 딜레이를 두어 BE의 onError 콜백이 먼저 실행될 시간을 확보
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        abortRef.current?.abort();
        clearRetry();
        retryTimerRef.current = setTimeout(() => {
          if (active) connect();
        }, 500);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      clearRetry();
      abortRef.current?.abort();
      abortRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, accessToken]);
}
