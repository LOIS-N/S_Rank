"use client";

/**
 * SSE 알림 훅
 *
 * [연동 체크리스트]
 * 1. BE에서 SSE 엔드포인트 경로 확정 → SSE_ENDPOINT 상수 변경
 * 2. 토큰 전달 방식 협의:
 *    - EventSource는 커스텀 헤더 미지원
 *    - 방법A (기본): 쿼리 파라미터 (?token=...)  ← 현재 구현
 *    - 방법B (권장): fetch + ReadableStream으로 교체 (헤더 지원)
 * 3. BE 이벤트 이름 확정 → addEventListener 이벤트명 변경
 * 4. BE 페이로드 구조 확정 → parseSSEPayload 내 파싱 로직 수정
 */

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";

// TODO: BE SSE 엔드포인트 확정 후 변경
const SSE_ENDPOINT = "/api/v1/notifications/sse";

// TODO: BE에서 전송하는 이벤트 이름 확정 후 변경
const SSE_EVENT_QUEST_COMPLETE = "quest-complete";

/** BE SSE 페이로드 예상 구조 (BE 팀과 협의 후 확정) */
interface QuestCompletePayload {
  nickname?: string;
  questTitle?: string;
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
    icon: "/assets/icons/icon-192.png",
    badge: "/assets/icons/icon-192.png",
    // TODO: 클릭 시 앱으로 포커스 이동은 Service Worker 연동 필요
  });
}

/** 알림 권한 요청 (최초 1회, 로그인 후 호출) */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
}

/**
 * SSE 알림 훅 — AuthProvider 또는 인증 완료 시점 컴포넌트에서 호출
 *
 * @example
 * // AuthProvider.tsx 또는 GlobalModals.tsx 에서:
 * const { accessToken } = useGameStore();
 * useSSENotification(accessToken);
 */
export function useSSENotification(accessToken: string | null) {
  const esRef = useRef<EventSource | null>(null);
  const { nickname } = useGameStore();
  const { isAuthenticated } = useUserStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // 알림 권한 요청 (비차단 — 허용 안 해도 인앱 fallback으로 동작)
    requestNotificationPermission();

    // TODO: 방법B(fetch streaming)로 교체 시 아래 URL 방식 변경
    const url = `${SSE_ENDPOINT}?token=${encodeURIComponent(accessToken)}`;
    const es = new EventSource(url);
    esRef.current = es;

    /** 퀘스트 완료 이벤트 수신 */
    es.addEventListener(SSE_EVENT_QUEST_COMPLETE, (event: MessageEvent) => {
      const payload = parseSSEPayload(event.data);
      const name = payload.nickname || nickname || "개발자";
      const body = `${name}님, 프로젝트가 완수됐어요! 지금 바로 보상을 수령하세요!`;

      // 1순위: 브라우저 Web Notification (백그라운드 탭 / 모바일 PWA)
      if (Notification.permission === "granted") {
        showWebNotification("S급 개발자들이 나를 따르는 이유", body);
      } else {
        // 2순위: TODO — 인앱 토스트/모달 표시
        // 예: useGameStore.getState().openComingSoonModal(body);
        console.info("[SSE] 알림 권한 없음, 인앱 fallback:", body);
      }
    });

    // EventSource 오류 시 브라우저가 자동 재연결 시도
    es.onerror = (err) => {
      console.warn("[SSE] 연결 오류, 자동 재연결 중...", err);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [isAuthenticated, accessToken, nickname]);
}