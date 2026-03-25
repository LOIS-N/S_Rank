"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const pathname = usePathname();
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  // portal-root 마운트
  useEffect(() => {
    setPortalTarget(document.getElementById("portal-root"));
  }, []);

  // Android: beforeinstallprompt 즉시 캡처 (조건 무관)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      localStorage.removeItem("pwa-installed"); // 앱 삭제 후 재설치 가능하도록 플래그 초기화
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // 설치 완료 시 localStorage에 저장 → 이후 배너 미표시
    const installedHandler = () => {
      localStorage.setItem("pwa-installed", "1");
      setVisible(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // 표시 조건 판단 + 1.5초 딜레이
  useEffect(() => {
    if (pathname !== "/" || !isAuthenticated) {
      setVisible(false);
      return;
    }

    // 이미 설치됨 (standalone 모드 or appinstalled 기록)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem("pwa-installed") === "1") return;

    // 오늘은 안보기 체크 (1일 유효)
    const hideUntil = localStorage.getItem("pwa-modal-hide-until");
    if (hideUntil && Date.now() < Number(hideUntil)) return;

    // 모바일 기기만
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) &&
      !(window.navigator as Navigator & { standalone?: boolean }).standalone;
    const isAndroid = /android/i.test(ua);

    if (!isIOS && !isAndroid) return;

    setPlatform(isIOS ? "ios" : "android");

    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [pathname, isAuthenticated, deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  const handleHideToday = () => {
    setVisible(false);
    localStorage.setItem("pwa-modal-hide-until", String(Date.now() + 24 * 60 * 60 * 1000));
  };

  const handleClose = () => setVisible(false);

  if (!visible || !portalTarget) return null;

  const guideText = platform === "ios"
    ? <>Safari 공유(□↑) → <span className="text-[#3a5a8a] font-bold">홈 화면에 추가</span></>
    : deferredPrompt
      ? <>아래 버튼으로 홈 화면에 추가하세요</>
      : <>Chrome 메뉴(⋮) → <span className="text-[#3a5a8a] font-bold">홈 화면에 추가</span></>;

  return createPortal(
    <div className="fixed top-0 left-0 right-0 z-[99999] font-dot font-bold pointer-events-auto
      bg-[#b0c4de] border-b-4 border-[#6b859e] shadow-[0px_4px_0px_#4a5d73]
      flex items-center gap-3 px-3 py-2">

      {/* 아이콘 */}
      <img
        src="/assets/icons/icon-192.png"
        alt="앱 아이콘"
        className="w-8 h-8 rounded-lg border-2 border-[#6b859e] flex-shrink-0"
      />

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <div className="text-[#4a5d73] text-xs leading-none mb-1">앱 설치 안내</div>
        <div className="text-[#1a2a3a] text-xs leading-snug">{guideText}</div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-2 flex-shrink-0">
        {platform === "android" && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="px-3 py-1 text-xs bg-[#ffcc00] text-black border-b-2 border-r-2 border-[#cc9900] active:border-0 active:translate-y-0.5 transition-all whitespace-nowrap"
          >
            설치
          </button>
        )}
        <button
          onClick={handleHideToday}
          className="px-2 py-1 text-xs bg-[#6b859e] text-white border-b-2 border-r-2 border-[#3e5368] active:border-0 active:translate-y-0.5 transition-all whitespace-nowrap"
        >
          오늘은 안보기
        </button>
        <button
          onClick={handleClose}
          className="px-2 py-1 text-xs bg-[#6b859e] text-white border-b-2 border-r-2 border-[#3e5368] active:border-0 active:translate-y-0.5 transition-all"
        >
          ✕
        </button>
      </div>
    </div>,
    portalTarget
  );
}
