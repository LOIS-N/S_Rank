"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import MyPageModal from "./modals/MyPageModal";
import RankingModal from "./modals/RankingModal";
import DiscordModal from "./modals/DiscordModal";
import NotificationModal from "./modals/NotificationModal";
import AchievementModal from "./modals/AchievementModal";

export default function MainHUD() {
  const { gold, coffee, unreadNotifications } = useGameStore();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 pointer-events-none font-dot flex flex-col justify-between select-none">
      
      {/* --- 상단 바 --- */}
      <div className="w-full bg-[#8ea4b8] border-b-[3px] border-[#6b859e] pointer-events-auto shadow-md">
        <div className="w-full mx-auto p-2 md:p-3 flex flex-col md:flex-row justify-between items-center bg-[#b0c4de]/40 gap-2 md:gap-0">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:pl-4">
            <div className="font-bold text-[18px] sm:text-[22px] drop-shadow-[2px_2px_0px_#000] text-white mr-6">
              S급 개발자들이 나를 따르는 이유
            </div>
            
            {/* Gold Container */}
            <div className="relative flex items-center h-[52px] sm:h-[60px] w-32 sm:w-44 md:w-56">
              <div 
                className="absolute left-8 right-0 top-0 bottom-0 text-black drop-shadow-sm text-shadow-sm font-bold flex items-center justify-end pr-4 sm:pr-6 text-[14px] sm:text-[18px] md:text-[22px]"
                style={{ backgroundImage: "url('/assets/002/upperBlank_002.png')", backgroundSize: "100% 100%" }}
              >
                <span className="tabular-nums">{gold.toLocaleString()}</span> <span className="ml-1 text-[12px] sm:text-[16px] md:text-[18px]">G</span>
              </div>
              <img src="/assets/002/coin_002.png" alt="gold" className="absolute -left-6 top-1 w-12 sm:w-16 h-12 sm:h-16 pixelated z-10" style={{ imageRendering: 'pixelated' }} />
            </div>

            {/* Coffee Container */}
            <div className="relative flex items-center h-[52px] sm:h-[60px] w-32 sm:w-44 md:w-56 ml-4">
              <div 
                className="absolute left-8 right-0 top-0 bottom-0 text-black drop-shadow-sm text-shadow-sm font-bold flex items-center justify-end pr-4 sm:pr-6 text-[14px] sm:text-[18px] md:text-[22px]"
                style={{ backgroundImage: "url('/assets/002/upperBlank_002.png')", backgroundSize: "100% 100%" }}
              >
                <span className="tabular-nums">{coffee.toLocaleString()}</span> <span className="ml-1 text-[12px] sm:text-[16px] md:text-[18px]">잔</span>
              </div>
              <img src="/assets/002/coffee_002.png" alt="coffee" className="absolute -left-6 top-1 w-12 sm:w-16 h-12 sm:h-16 pixelated z-10" style={{ imageRendering: 'pixelated' }} />
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 md:gap-4 md:pr-4">
            {[
              { id: "mypage", icon: "/assets/002/mypage_002.png", label: "마이페이지" },
              { id: "ranking", icon: "/assets/002/ranking_002.png", label: "랭킹" },
              { id: "discord", icon: "/assets/002/discord_002.png", label: "디스코드" },
              { id: "notification", icon: "/assets/002/message_002.png", label: "알림" },
              { id: "achievement", icon: "/assets/002/awards_002.png", label: "업적" }
            ].map((item) => (
               <button 
                 key={item.id} 
                 onClick={() => setActiveModal(item.id)}
                 className="relative w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center shadow-[1px_1px_0px_#000] active:translate-y-0.5 transition-all hover:brightness-110"
                 style={{ backgroundImage: "url('/assets/002/upperButton_002.png')", backgroundSize: "100% 100%" }}
                 title={item.label}
               >
                 <img src={item.icon} alt={item.label} className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" style={{ imageRendering: 'pixelated' }} />
                 {item.id === "notification" && unreadNotifications > 0 && (
                   <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-red-600 rounded-full flex items-center justify-center border-2 border-[#b0c4de]" />
                 )}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* --- 모달 영역 --- */}
      {activeModal === "mypage" && <MyPageModal onClose={() => setActiveModal(null)} />}
      {activeModal === "ranking" && <RankingModal onClose={() => setActiveModal(null)} />}
      {activeModal === "discord" && <DiscordModal onClose={() => setActiveModal(null)} />}
      {activeModal === "notification" && <NotificationModal onClose={() => setActiveModal(null)} />}
      {activeModal === "achievement" && <AchievementModal onClose={() => setActiveModal(null)} />}

      <div className="flex-1" />
    </div>
  );
}