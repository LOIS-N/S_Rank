"use client";

import { useRouter, usePathname } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

// 하단 네비게이션이 항상 표시될 서브 페이지 목록
const SUB_PAGES = ["/quest", "/gacha", "/card-list"];

export default function BottomNavBar() {
  const { gameStatus, openComingSoonModal } = useGameStore();
  const router = useRouter();
  const pathname = usePathname();

  const isSubPage = SUB_PAGES.includes(pathname);

  // 메인 페이지(/)에서는 PLAYING 상태일 때만, 서브 페이지는 항상 표시
  if (!isSubPage && gameStatus !== "PLAYING") return null;

  const menuItems = [
    { name: "카드 목록", disabled: false },
    { name: "퀘스트",   disabled: false },
    { name: "메인",     disabled: false },
    { name: "뽑기",     disabled: false },
    { name: "강화",     disabled: true  },
    { name: "합성",     disabled: true  },
    { name: "거래",     disabled: true  },
  ];

  const handleMenuClick = (item: string, disabled: boolean) => {
    if (disabled) { openComingSoonModal(); return; }
    switch (item) {
      case "카드 목록": router.push("/card-list"); break;
      case "퀘스트":   router.push("/quest");     break;
      case "뽑기":     router.push("/gacha");     break;
      case "메인":     router.push("/");           break;
      default: break;
    }
  };

  // 현재 페이지에 해당하는 버튼 이름
  const activeItem =
    pathname === "/quest"     ? "퀘스트"   :
    pathname === "/gacha"     ? "뽑기"     :
    pathname === "/card-list" ? "카드 목록" :
    pathname === "/"          ? "메인"     : "";

  return (
    <div className="absolute bottom-0 left-0 w-full z-[80] pointer-events-none overflow-hidden">
      <div
        className="w-full bg-[#8ea4b8] border-t-4 border-x-2 border-b-2 border-black pointer-events-auto shadow-[0_-4px_10px_rgba(0,0,0,0.5)]"
        style={{
          paddingTop: "0.6cqw",
          // iOS PWA 홈 인디케이터 영역 확보 (viewport-fit=cover 필요 — layout.tsx에 설정됨)
          paddingBottom: "calc(0.6cqw + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="w-full flex justify-center" style={{ paddingLeft: "0.6cqw", paddingRight: "0.6cqw" }}>
          <div className="flex flex-nowrap justify-center w-full overflow-x-hidden"
            style={{ gap: "0.4cqw" }}>
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleMenuClick(item.name, item.disabled)}
                className="flex items-center justify-center text-black font-bold drop-shadow-md hover:brightness-110 flex-shrink-0"
                style={{
                  width: "12.5cqw",
                  height: "4.7cqw",
                  fontSize: "1.6cqw",
                  backgroundImage: "url('/assets/002/lowerButton_001.webp')",
                  backgroundSize: "100% 100%",
                  imageRendering: "pixelated",
                  filter: (item.disabled || item.name === activeItem) ? "brightness(0.75)" : undefined,
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
