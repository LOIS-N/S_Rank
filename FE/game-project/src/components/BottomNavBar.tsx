"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// 하단 네비게이션이 항상 표시될 서브 페이지 목록
const SUB_PAGES = ["/quest", "/gacha", "/card-list", "/enhance", "/synthesis", "/trade"];


export default function BottomNavBar() {
  const { gameStatus, openComingSoonModal, tutorialActive, tutorialAccessPage, quests, tutorialQuestStep, tutorialQuestScriptVisible } = useGameStore();
  const router = useRouter();
  const pathname = usePathname();
  const [arrowDismissed, setArrowDismissed] = useState(false);
  useEffect(() => { setArrowDismissed(false); }, [tutorialAccessPage]);

  const isSubPage = SUB_PAGES.includes(pathname);

  // 메인 페이지(/)에서는 PLAYING 상태일 때만, 서브 페이지는 항상 표시
  if (!isSubPage && gameStatus !== "PLAYING") return null;
  // 튜토리얼 진행 중에는 숨김
  if (tutorialActive) return null;

  // Map tutorialAccessPage to nav button name
  const tutorialAllowedName: string | null =
    tutorialAccessPage === 'gacha' ? '뽑기' :
    tutorialAccessPage === 'quest' ? '퀘스트' :
    tutorialAccessPage === 'enhance' ? '강화' :
    tutorialAccessPage === 'synthesis' ? '합성' :
    null;

  // 튜토리얼 퀘스트 진행 중(타이머 카운트 중)이면 퀘스트 페이지 진입 차단
  const isTutorialQuestRunning = tutorialQuestStep !== null && quests[0]?.status === 'IN_PROGRESS';

  const menuItems = [
    { name: "카드 목록", disabled: tutorialAllowedName ? tutorialAllowedName !== "카드 목록" : false },
    { name: "퀘스트",   disabled: tutorialAllowedName ? tutorialAllowedName !== "퀘스트" : isTutorialQuestRunning },
    { name: "메인",     disabled: false },
    { name: "뽑기",     disabled: tutorialAllowedName ? tutorialAllowedName !== "뽑기"     : false },
    { name: "강화",     disabled: tutorialAllowedName ? tutorialAllowedName !== "강화"     : false },
    { name: "합성",     disabled: tutorialAllowedName ? tutorialAllowedName !== "합성"     : false },
    { name: "거래",     disabled: tutorialAllowedName ? tutorialAllowedName !== "거래" : false },
  ];

  const handleMenuClick = (item: string, disabled: boolean) => {
    if (tutorialQuestScriptVisible) return;
    if (disabled) {
      const msg = tutorialAllowedName !== null ? "튜토리얼 진행 후 이용 가능합니다." : undefined;
      openComingSoonModal(msg);
      return;
    }
    switch (item) {
      case "카드 목록": router.push("/card-list"); break;
      case "퀘스트":   router.push("/quest");     break;
      case "뽑기":     router.push("/gacha");     break;
      case "강화":     router.push("/enhance");   break;
      case "합성":     router.push("/synthesis"); break;
      case "메인":     router.push("/");           break;
      case "거래":     router.push("/trade");     break;
      default: break;
    }
  };

  // 현재 페이지에 해당하는 버튼 이름
  const activeItem =
    pathname === "/quest"     ? "퀘스트"   :
    pathname === "/gacha"     ? "뽑기"     :
    pathname === "/card-list" ? "카드 목록" :
    pathname === "/enhance"   ? "강화"     :
    pathname === "/synthesis" ? "합성"     :
    pathname === "/trade"     ? "거래"     :
    pathname === "/"          ? "메인"     : "";

  // 튜토리얼 화살표 위치: 버튼 인덱스 기준으로 cqw 계산
  const BUTTON_W = 12.5;  // cqw
  const GAP = 0.4;        // cqw
  const H_PAD = 0.6;      // cqw (좌우 패딩)
  const totalBtnW = menuItems.length * BUTTON_W + (menuItems.length - 1) * GAP;
  const flexStart = H_PAD + (100 - H_PAD * 2 - totalBtnW) / 2;
  const arrowIdx = tutorialAllowedName ? menuItems.findIndex(i => i.name === tutorialAllowedName) : -1;
  const arrowCenterCqw = arrowIdx >= 0 ? flexStart + arrowIdx * (BUTTON_W + GAP) + BUTTON_W / 2 : 0;

  return (
    <div className="absolute left-0 w-full z-[80] pointer-events-none overflow-visible" style={{ bottom: "var(--game-clip-y, 0px)" }}>
      {/* 튜토리얼 화살표 — overflow-x-hidden 컨테이너 밖에서 렌더링 */}
      {tutorialAllowedName && arrowIdx >= 0 && !arrowDismissed && activeItem !== tutorialAllowedName && (
        <img
          src={`${ASSET_BASE}/assets/tutorial/arrow.webp`}
          alt=""
          className="tutorial-arrow-bounce"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: `${arrowCenterCqw}cqw`,
            height: '4.7cqw',
            width: 'auto',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        className="w-full bg-[#8ea4b8] border-t-4 border-x-2 border-b-2 border-black pointer-events-auto shadow-[0_-4px_10px_rgba(0,0,0,0.5)]"
        style={{
          paddingTop: "0.6cqw",
          paddingBottom: "calc(0.6cqw + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="w-full flex justify-center" style={{ paddingLeft: "0.6cqw", paddingRight: "0.6cqw" }}>
          <div className="flex flex-nowrap justify-center w-full overflow-x-hidden"
            style={{ gap: "0.4cqw" }}>
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => { if (tutorialAllowedName && item.name === tutorialAllowedName) setArrowDismissed(true); handleMenuClick(item.name, item.disabled); }}
                className="flex items-center justify-center text-black font-bold drop-shadow-md hover:brightness-110 flex-shrink-0"
                style={{
                  width: "12.5cqw",
                  height: "4.7cqw",
                  fontSize: "1.6cqw",
                  backgroundImage: `url('${ASSET_BASE}/assets/002/lowerButton_001.webp')`,
                  backgroundSize: "100% 100%",
                  imageRendering: "pixelated",
                  filter: (item.disabled || item.name === activeItem || tutorialQuestScriptVisible) ? "brightness(0.75)" : undefined,
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
