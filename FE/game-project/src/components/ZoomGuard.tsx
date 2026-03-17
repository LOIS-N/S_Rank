"use client";

import { useEffect } from "react";

/**
 * ZoomGuard - 브라우저 줌 & 리사이즈에 안전한 스케일링 컴포넌트
 *
 * visualViewport API를 사용하여 실제 뷰포트 크기를 감지하고
 * --app-scale CSS 변수로 .game-wrapper의 transform: scale()을 제어합니다.
 *
 * 브라우저 줌 시 window.innerWidth/Height는 변하지만
 * visualViewport.width/height + visualViewport.scale을 조합하면
 * 실제 물리적 뷰포트 크기를 정확히 구할 수 있습니다.
 */
export default function ZoomGuard() {
  useEffect(() => {
    const BASE_W = 1280;
    const BASE_H = 720;

    const updateScale = () => {
      // visualViewport가 있으면 줌 보정된 실제 크기 사용
      // 없으면 window.innerWidth/Height 폴백
      let vw: number, vh: number;

      if (window.visualViewport) {
        // visualViewport.width/height는 줌이 적용된 CSS 픽셀 크기
        vw = window.visualViewport.width;
        vh = window.visualViewport.height;
      } else {
        vw = window.innerWidth;
        vh = window.innerHeight;
      }

      const scaleX = vw / BASE_W;
      const scaleY = vh / BASE_H;
      const scale = Math.min(scaleX, scaleY);

      document.documentElement.style.setProperty("--app-scale", String(scale));
    };

    updateScale();

    // 일반 리사이즈
    window.addEventListener("resize", updateScale);

    // visualViewport 리사이즈 (줌 변경 감지)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateScale);
      window.visualViewport.addEventListener("scroll", updateScale);
    }

    return () => {
      window.removeEventListener("resize", updateScale);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateScale);
        window.visualViewport.removeEventListener("scroll", updateScale);
      }
    };
  }, []);

  return null; // UI 렌더링 없음
}
