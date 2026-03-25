"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // portal-root 마운트
  useEffect(() => {
    setPortalTarget(document.getElementById("portal-root"));
  }, []);

  // Android: beforeinstallprompt 즉시 캡처 (조건 무관)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // 표시 조건 판단 + 1.5초 딜레이
  useEffect(() => {
    if (pathname !== "/" || !isAuthenticated) {
      setVisible(false);
      return;
    }

    // 오늘은 안보기 체크 (1일 유효)
    const hideUntil = localStorage.getItem("pwa-modal-hide-until");
    if (hideUntil && Date.now() < Number(hideUntil)) return;

    // 이미 설치됨 (standalone 모드)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

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
    ? <>Safari 하단 <span className="text-[#3a5a8a]">공유(□↑)</span> 버튼 →<br /><span className="text-[#3a5a8a]">홈 화면에 추가</span> 를 눌러주세요</>
    : deferredPrompt
      ? <>아래 <span className="text-[#3a5a8a]">설치하기</span> 버튼을 눌러<br />홈 화면에 추가하세요</>
      : <>Chrome 메뉴 <span className="text-[#3a5a8a]">⋮</span> →<br /><span className="text-[#3a5a8a]">홈 화면에 추가</span> 를 눌러주세요</>;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto">
      <div className="bg-[#b0c4de] p-6 border-4 border-[#6b859e] w-[320px] max-w-[90%] flex flex-col items-center gap-4 shadow-[8px_8px_0px_#4a5d73] relative">

        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-3 text-[#6b859e] text-xl hover:text-[#4a5d73] leading-none"
        >
          ✕
        </button>

        {/* 타이틀 */}
        <div className="text-[#4a5d73] text-base tracking-wide mt-1">
          앱 설치 안내
        </div>

        {/* 구분선 */}
        <div className="w-full border-t-2 border-[#6b859e]" />

        {/* 아이콘 */}
        <img
          src="/assets/icons/icon-192.png"
          alt="앱 아이콘"
          className="w-16 h-16 rounded-xl shadow-[4px_4px_0px_#4a5d73]"
        />

        {/* 앱 이름 */}
        <div className="text-[#4a5d73] text-sm text-center leading-snug">
          S급 개발자들이<br />나를 따르는 이유
        </div>

        {/* 안내 문구 */}
        <div className="bg-[#8ea4b8] border-2 border-[#6b859e] w-full text-center text-[#1a2a3a] text-xs py-3 px-4 leading-relaxed">
          {guideText}
        </div>

        {/* 버튼 영역 */}
        <div className="flex gap-3 w-full">
          {platform === "android" && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="flex-1 py-3 text-sm bg-[#ffcc00] text-black border-b-4 border-r-4 border-[#cc9900] active:border-0 active:translate-y-1 transition-all"
            >
              설치하기
            </button>
          )}
          <button
            onClick={handleHideToday}
            className="flex-1 py-3 text-xs bg-[#6b859e] text-white border-b-4 border-r-4 border-[#3e5368] active:border-0 active:translate-y-1 transition-all"
          >
            오늘은 안보기
          </button>
          <button
            onClick={handleClose}
            className="flex-1 py-3 text-xs bg-[#6b859e] text-white border-b-4 border-r-4 border-[#3e5368] active:border-0 active:translate-y-1 transition-all"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
