"use client";

import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

export default function BottomNavBar() {
  const { gameStatus, openComingSoonModal } = useGameStore();
  const router = useRouter();

  // 게임 플레이 중(PLAYING)인 경우에만 메뉴바 표시
  if (gameStatus !== 'PLAYING') return null;

  const menuItems = [
    { name: "카드 목록", disabled: false },
    { name: "퀘스트", disabled: false },
    { name: "메인", disabled: false },
    { name: "뽑기", disabled: false },
    { name: "강화", disabled: true },
    { name: "합성", disabled: true },
    { name: "거래", disabled: true },
  ];

  const handleMenuClick = (item: string, disabled: boolean) => {
    if (disabled) {
      openComingSoonModal();
      return;
    }

    switch (item) {
      case "카드 목록":
        router.push("/card-list");
        break;
      case "퀘스트":
        router.push("/quest");
        break;
      case "뽑기":
        router.push("/gacha");
        break;
      case "메인":
        router.push("/");
        break;
      default:
        console.log(`${item} 기능은 준비 중입니다.`);
        break;
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full z-[80] pointer-events-none">
      <div className="w-full bg-[#8ea4b8] border-t-4 border-black pointer-events-auto pt-2 pb-2 border-x-2 border-b-2 border-black shadow-[0_-4px_10px_rgba(0,0,0,0.5)]" style={{ zoom: 1/3 }}>
        <div className="w-full mx-auto flex justify-center px-2">
          <div className="flex flex-nowrap justify-center gap-1 w-full overflow-x-auto no-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleMenuClick(item.name, item.disabled)}
                className={`flex items-center justify-center text-black font-bold drop-shadow-md transition-all
                  active:translate-x-0.5 active:translate-y-0.5 hover:brightness-110
                  w-[160px] h-[60px]
                  text-[20px] flex-shrink-0
                  ${item.disabled ? 'brightness-75' : ''}`}
                style={{ 
                  backgroundImage: "url('/assets/002/lowerButton_001.png')", 
                  backgroundSize: "100% 100%",
                  imageRendering: "pixelated",
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

