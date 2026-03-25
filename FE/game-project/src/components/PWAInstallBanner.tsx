"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 메인 페이지(/)이고 로그인된 상태에서만 표시
    if (pathname !== "/" || !isAuthenticated) return;

    // 오늘은 안보기 체크 (1일 유효)
    const hideUntil = localStorage.getItem("pwa-banner-hide-until");
    if (hideUntil && Date.now() < Number(hideUntil)) return;

    // 이미 standalone(설치됨) 모드면 배너 미표시
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // 모바일 기기 감지 (iOS / Android)
    const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // iOS 감지
    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as Navigator & { standalone?: boolean }).standalone;

    if (isIOS) {
      setShowIOS(true);
      return;
    }

    // Android Chrome: beforeinstallprompt 이벤트 대기
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [pathname, isAuthenticated]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowAndroid(false);
    }
    setDeferredPrompt(null);
  };

  // ✕ 버튼: 현재 세션만 닫기 (새로고침 시 다시 표시)
  const handleDismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
  };

  // 오늘은 안보기: 1일 동안 미표시
  const handleHideToday = () => {
    setShowAndroid(false);
    setShowIOS(false);
    localStorage.setItem("pwa-banner-hide-until", String(Date.now() + 24 * 60 * 60 * 1000));
  };

  if (!showAndroid && !showIOS) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)",
        borderBottom: "1px solid #3a3a6a",
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* 아이콘 */}
      <img
        src="/assets/icons/icon-192.png"
        alt="앱 아이콘"
        style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }}
      />

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#e0e0ff", fontSize: 11, fontWeight: "bold" }}>
          S급 개발자들이 나를 따르는 이유
        </div>
        {showAndroid ? (
          <div style={{ color: "#8888bb", fontSize: 10 }}>
            홈 화면에 추가하고 앱처럼 사용하세요
          </div>
        ) : (
          <div style={{ color: "#8888bb", fontSize: 10 }}>
            공유(□↑) → <span style={{ color: "#aaddff" }}>홈 화면에 추가</span>
          </div>
        )}
      </div>

      {/* 버튼 영역 */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {showAndroid && (
          <button
            onClick={handleInstall}
            style={{
              background: "linear-gradient(135deg, #4a4aaa, #2a2a7a)",
              border: "1px solid #6a6acc",
              color: "#e0e0ff",
              fontSize: 10,
              padding: "4px 10px",
              borderRadius: 3,
              cursor: "pointer",
              fontFamily: "'Courier New', monospace",
              whiteSpace: "nowrap",
            }}
          >
            설치
          </button>
        )}
        <button
          onClick={handleHideToday}
          style={{
            background: "transparent",
            border: "1px solid #3a3a6a",
            color: "#8888aa",
            fontSize: 10,
            padding: "4px 8px",
            borderRadius: 3,
            cursor: "pointer",
            fontFamily: "'Courier New', monospace",
            whiteSpace: "nowrap",
          }}
        >
          오늘은 안보기
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "1px solid #3a3a6a",
            color: "#666699",
            fontSize: 10,
            padding: "4px 8px",
            borderRadius: 3,
            cursor: "pointer",
            fontFamily: "'Courier New', monospace",
            whiteSpace: "nowrap",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
