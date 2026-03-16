"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import MyPageModal from "./modals/MyPageModal";
import RankingModal from "./modals/RankingModal";
import DiscordModal from "./modals/DiscordModal";
import NotificationModal from "./modals/NotificationModal";
import AchievementModal from "./modals/AchievementModal";

export default function MainHUD() {
  const { gold, coffee, unreadNotifications, activeRewardModal, closeRewardModal } = useGameStore();

  const [activeModal, setActiveModal] = useState<string | null>(null);

  const menuItems = ["카드 목록", "퀘스트", "메인", "뽑기", "강화", "합성", "거래"];

  return (
    <div className="absolute inset-0 pointer-events-none font-dot flex flex-col justify-between select-none">
      
      {/* --- 상단 바 (전체 너비 페일 블루 그레이 배경, 반응형 구성) --- */}
      <div className="w-full bg-[#8ea4b8] border-b-[6px] border-[#6b859e] pointer-events-auto shadow-md">
        <div className="w-full mx-auto p-4 flex flex-col md:flex-row justify-between items-center bg-[#b0c4de]/40 gap-4 md:gap-0">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:pl-4">
            <div className="font-bold text-[30px] sm:text-[34px] drop-shadow-[3px_3px_0px_#000] text-white">
            S급 개발자들이 나를 따르는 이유
          </div>
          
          {/* Gold Container */}
          <div className="relative flex items-center h-16 sm:h-20 w-48 sm:w-56 md:w-64 ml-4 md:ml-10">
            <div 
              className="absolute left-10 right-0 top-0 bottom-0 text-white drop-shadow-md text-shadow-sm font-bold flex items-center justify-end pr-5 sm:pr-6 text-[24px] sm:text-[28px] md:text-[34px]"
              style={{ backgroundImage: "url('/assets/upperBlank_002.png')", backgroundSize: "100% 100%" }}
            >
              <span className="tabular-nums">{gold.toLocaleString()}</span> <span className="ml-2 text-[24px] sm:text-[28px] md:text-[32px] text-yellow-300">G</span>
            </div>
            <img src="/assets/coin_002.png" alt="gold" className="absolute -left-6 top-0 w-16 sm:w-20 h-16 sm:h-20 pixelated z-10" style={{ imageRendering: 'pixelated' }} />
          </div>

          {/* Coffee Container */}
          <div className="relative flex items-center h-16 sm:h-20 w-48 sm:w-56 md:w-64 ml-4 md:ml-10">
            <div 
              className="absolute left-10 right-0 top-0 bottom-0 text-white drop-shadow-md text-shadow-sm font-bold flex items-center justify-end pr-5 sm:pr-6 text-[24px] sm:text-[28px] md:text-[34px]"
              style={{ backgroundImage: "url('/assets/upperBlank_002.png')", backgroundSize: "100% 100%" }}
            >
              <span className="tabular-nums">{coffee.toLocaleString()}</span> <span className="ml-2 text-[24px] sm:text-[28px] md:text-[32px] text-amber-300">잔</span>
            </div>
            <img src="/assets/coffee_002.png" alt="coffee" className="absolute -left-6 top-0 w-16 sm:w-20 h-16 sm:h-20 pixelated z-10" style={{ imageRendering: 'pixelated' }} />
          </div>
        </div>

        <div className="flex gap-3 sm:gap-4 md:gap-5 md:pr-4">
          {/* 우측 상단 5개 모달 버튼들: 마이페이지, 랭킹, 디스코드, 알림, 업적 */}
          {[
            { id: "mypage", icon: "/assets/mypage_002.png", label: "마이페이지" },
            { id: "ranking", icon: "/assets/ranking_002.png", label: "랭킹" },
            { id: "discord", icon: "/assets/discord_002.png", label: "디스코드" },
            { id: "notification", icon: "/assets/message_002.png", label: "알림" },
            { id: "achievement", icon: "/assets/awards_002.png", label: "업적" }
          ].map((item) => (
             <button 
               key={item.id} 
               onClick={() => setActiveModal(item.id)}
               className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-1 transition-all hover:brightness-110"
               style={{ backgroundImage: "url('/assets/upperButton_002.png')", backgroundSize: "100% 100%" }}
               title={item.label}
             >
               <img src={item.icon} alt={item.label} className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16" style={{ imageRendering: 'pixelated' }} />
               {item.id === "notification" && unreadNotifications > 0 && (
                 <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-red-600 rounded-full border-2 border-white flex items-center justify-center">
                   <span className="text-white text-[10px] sm:text-[12px] md:text-[14px] font-bold">{unreadNotifications}</span>
                 </div>
               )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- 모달 렌더링 영역 --- */}
      {activeModal === "mypage" && <MyPageModal onClose={() => setActiveModal(null)} />}
      {activeModal === "ranking" && <RankingModal onClose={() => setActiveModal(null)} />}
      {activeModal === "discord" && <DiscordModal onClose={() => setActiveModal(null)} />}
      {activeModal === "notification" && <NotificationModal onClose={() => setActiveModal(null)} />}
      {activeModal === "achievement" && <AchievementModal onClose={() => setActiveModal(null)} />}

      {/* --- 중앙 (빈 공간, 게임 화면이 보임) --- */}
      <div className="flex-1" />

      {/* --- 하단 메뉴바 (항상 고정, 반응형 지원, 사이즈/간격 조절) --- */}
      <div className="w-full bg-[#8ea4b8] border-t-[6px] border-[#6b859e] pointer-events-auto pt-3 pb-3">
        <div className="w-full mx-auto flex justify-center px-4">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-[10px] w-full">
          {menuItems.map((item) => (
            <button
              key={item}
              className={`flex items-center justify-center text-black font-bold drop-shadow-md transition-all
                active:translate-x-0.5 active:translate-y-0.5 hover:brightness-110
                w-[145px] h-[45px] sm:w-[180px] sm:h-[57px] lg:w-[215px] lg:h-[68px]
                text-[20px] sm:text-[30px] lg:text-[34px]`}
              style={{ 
                backgroundImage: "url('/assets/lowerButton_001.png')", 
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

      {/* --- 퀘스트 완료 보상 모달 --- */}
      {activeRewardModal?.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#8ea4b8]/80 font-dot pointer-events-auto">
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-8 text-center max-w-sm shadow-[8px_8px_0px_#4a5d73]">
            <h2 className="text-3xl mb-4 text-slate-900 font-bold">{activeRewardModal.title}</h2>
            <p className="text-xl mb-8 leading-relaxed text-blue-700 font-bold">{activeRewardModal.text}</p>
            <button 
              onClick={closeRewardModal}
              className="w-full py-4 bg-[#ffcc00] text-black border-b-4 border-r-4 border-[#cc9900] active:border-0 active:translate-y-1 transition-all text-xl"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}