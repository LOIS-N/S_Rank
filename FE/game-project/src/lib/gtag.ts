/**
 * GA4 커스텀 이벤트 헬퍼
 *
 * window.gtag가 로드되지 않은 환경(개발, 테스트)에서는 silently 무시.
 */

declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
  }
}

export function sendGAEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}