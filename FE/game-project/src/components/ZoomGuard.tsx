"use client";

import { useEffect } from "react";

/**
 * PWA/모바일 대응 뷰포트 고정.
 *
 * 문제: `.game-wrapper`가 100dvh/100vw를 직접 사용하면 페이지 이동 시
 *       시스템 UI(safe area, 소프트 키보드 등)에 따라 dvh가 미세하게 변해
 *       cqw 기준이 흔들려 버튼·스크롤바 크기가 들쭉날쭉해짐.
 *
 * 해결: window.innerWidth/Height를 CSS 변수 --avw / --avh 에 고정하고
 *       game-wrapper는 이 변수를 참조한다.
 *       resize/orientationchange 시만 갱신(debounce 150ms)하여
 *       소프트 키보드 등에 의한 불필요한 리사이즈는 무시한다.
 */
const GAME_W = 1280;
const GAME_H = 720;

/**
 * 콘솔 로그 + 전역 에러 억제.
 * 해제 방법 → 브라우저 콘솔에서 아래 명령 실행 후 새로고침:
 *   localStorage.setItem('debug', '1')
 * 다시 억제:
 *   localStorage.removeItem('debug')  →  새로고침
 *
 * 억제 범위:
 *   - console.log / info / warn / error / debug
 *   - 처리되지 않은 JS 예외 (window error)
 *   - 처리되지 않은 Promise rejection (unhandledrejection)
 *
 * 억제 불가 항목:
 *   - 브라우저가 직접 출력하는 "Failed to load resource" 네트워크 에러
 *     (예: GET https://... 404) → 브라우저 보안 정책상 JS로 차단 불가.
 *     Network 탭에서만 확인 가능하며 Console 필터에서 'Errors' 체크 해제로 숨길 수 있음.
 */
function suppressConsole() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('debug') === '1') return;

  const noop = () => {};
  console.log   = noop;
  console.info  = noop;
  console.warn  = noop;
  console.error = noop;
  console.debug = noop;

  // 처리되지 않은 JS 예외 억제
  window.addEventListener('error', (e) => { e.preventDefault(); }, true);

  // 처리되지 않은 Promise rejection 억제 (Axios, fetch 에러 포함)
  window.addEventListener('unhandledrejection', (e) => { e.preventDefault(); });
}
suppressConsole();

function applyViewportVars() {
  const root = document.documentElement;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 항상 뷰포트 안에 완전히 들어오도록 Math.min 스케일.
  // 좌우 레터박스(검은 여백)는 허용, 상하 클리핑은 방지.
  const scale = Math.min(vw / GAME_W, vh / GAME_H);

  // 상하 클립 보정값 (HUD·NavBar 오프셋용)
  const clipY = Math.max(0, (GAME_H - vh / scale) / 2);

  // 뷰포트를 game-wrapper 좌표계로 환산한 크기
  // → Phaser 캔버스가 game-wrapper 바깥으로 확장되어 뷰포트 전체를 채울 수 있게 함
  const vpW = vw / scale;
  const vpH = vh / scale;

  root.style.setProperty("--avw", `${vw}px`);
  root.style.setProperty("--avh", `${vh}px`);
  root.style.setProperty("--game-scale", `${scale}`);
  root.style.setProperty("--game-clip-y", `${clipY}px`);
  root.style.setProperty("--vp-w", `${vpW}px`);
  root.style.setProperty("--vp-h", `${vpH}px`);
}

export default function ZoomGuard() {
  useEffect(() => {
    applyViewportVars();

    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(applyViewportVars, 150);
    };

    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);

    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
      clearTimeout(timer);
    };
  }, []);

  return null;
}
