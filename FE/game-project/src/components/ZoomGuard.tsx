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
