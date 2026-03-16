"use client";

import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

export default function BottomNavBar() {
  const { gameStatus } = useGameStore();
  const router = useRouter();

  // 게임 플레이 중(PLAYING)인 경우에만 메뉴바 표시
  if (gameStatus !== 'PLAYING') return null;

  const menuItems = ["카드 목록", "퀘스트", "메인", "뽑기", "강화", "합성", "거래"];

  const handleMenuClick = (item: string) => {
    switch (item) {
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
      <div className="w-full bg-[#8ea4b8] border-t-4 border-black pointer-events-auto pt-3 pb-3 border-x-2 border-b-2 border-black shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
        <div className="w-full mx-auto flex justify-center px-4">
          <div className="flex flex-wrap justify-center gap-[1px] sm:gap-[2px] lg:gap-[1.5px] w-full">
            {menuItems.map((item) => (
              <button
                key={item}
                onClick={() => handleMenuClick(item)}
                className={`flex items-center justify-center text-black font-bold drop-shadow-md transition-all
                  active:translate-x-0.5 active:translate-y-0.5 hover:brightness-110
                  w-[174px] h-[64px] sm:w-[216px] sm:h-[78px] lg:w-[258px] lg:h-[92px]
                  text-[24px] sm:text-[36px] lg:text-[41px]`}
                style={{ 
                  backgroundImage: "url('/assets/002/lowerButton_001.png')", 
                  backgroundSize: "100% 100%",
                  imageRendering: "pixelated",
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
