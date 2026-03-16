"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import MyPageModal from "./modals/MyPageModal";
import RankingModal from "./modals/RankingModal";
import DiscordModal from "./modals/DiscordModal";
import NotificationModal from "./modals/NotificationModal";
import AchievementModal from "./modals/AchievementModal";

export default function MainHUD() {
  const { 
    gold, coffee, unreadNotifications, 
    activeRewardModal, closeRewardModal,
    activeUnlockConfirm, setUnlockConfirm, unlockQuestSlot
  } = useGameStore();

  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 pointer-events-none font-dot flex flex-col justify-between select-none">
      
      {/* --- 상단 바 --- */}
      <div className="w-full bg-[#8ea4b8] border-b-[6px] border-[#6b859e] pointer-events-auto shadow-md">
        <div className="w-full mx-auto p-4 flex flex-col md:flex-row justify-between items-center bg-[#b0c4de]/40 gap-4 md:gap-0">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:pl-4">
            <div className="font-bold text-[36px] sm:text-[42px] drop-shadow-[4px_4px_0px_#000] text-white mr-8">
              S급 개발자들이 나를 따르는 이유
            </div>
            
            {/* Gold Container */}
            <div className="relative flex items-center h-[90px] sm:h-[106px] w-56 sm:w-68 md:w-80">
              <div 
                className="absolute left-12 right-0 top-0 bottom-0 text-black drop-shadow-md text-shadow-sm font-bold flex items-center justify-end pr-6 sm:pr-8 text-[28px] sm:text-[34px] md:text-[41px]"
                style={{ backgroundImage: "url('/assets/002/upperBlank_002.png')", backgroundSize: "100% 100%" }}
              >
                <span className="tabular-nums">{gold.toLocaleString()}</span> <span className="ml-2 text-[28px] sm:text-[34px] md:text-[38px]">G</span>
              </div>
              <img src="/assets/002/coin_002.png" alt="gold" className="absolute -left-8 top-0 w-20 sm:w-24 h-20 sm:h-24 pixelated z-10" style={{ imageRendering: 'pixelated' }} />
            </div>

            {/* Coffee Container */}
            <div className="relative flex items-center h-[90px] sm:h-[106px] w-56 sm:w-68 md:w-80 ml-4">
              <div 
                className="absolute left-12 right-0 top-0 bottom-0 text-black drop-shadow-md text-shadow-sm font-bold flex items-center justify-end pr-6 sm:pr-8 text-[28px] sm:text-[34px] md:text-[41px]"
                style={{ backgroundImage: "url('/assets/002/upperBlank_002.png')", backgroundSize: "100% 100%" }}
              >
                <span className="tabular-nums">{coffee.toLocaleString()}</span> <span className="ml-2 text-[28px] sm:text-[34px] md:text-[38px]">잔</span>
              </div>
              <img src="/assets/002/coffee_002.png" alt="coffee" className="absolute -left-8 top-0 w-20 sm:w-24 h-20 sm:h-24 pixelated z-10" style={{ imageRendering: 'pixelated' }} />
            </div>
          </div>

          <div className="flex gap-3 sm:gap-4 md:gap-5 md:pr-4">
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
                 className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-1 transition-all hover:brightness-110"
                 style={{ backgroundImage: "url('/assets/002/upperButton_002.png')", backgroundSize: "100% 100%" }}
                 title={item.label}
               >
                 <img src={item.icon} alt={item.label} className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16" style={{ imageRendering: 'pixelated' }} />
                 {item.id === "notification" && unreadNotifications > 0 && (
                   <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-red-600 rounded-full flex items-center justify-center" />
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

      {/* --- 퀘스트 모달들 --- */}
      {activeRewardModal?.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#8ea4b8]/80 font-dot pointer-events-auto">
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-10 text-center max-w-md shadow-[8px_8px_0px_#4a5d73]">
            <h2 className="text-4xl mb-6 text-slate-900 font-bold">{activeRewardModal.title}</h2>
            <p className="text-2xl mb-10 leading-relaxed text-blue-700 font-bold">{activeRewardModal.text}</p>
            <button 
              onClick={closeRewardModal}
              className="w-full py-5 bg-[#ffcc00] text-black border-b-4 border-r-4 border-[#cc9900] active:border-0 active:translate-y-1 transition-all text-2xl font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {activeUnlockConfirm?.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#8ea4b8]/80 font-dot pointer-events-auto">
          <div className="bg-[#b0c4de] border-4 border-[#6b859e] p-10 text-center max-w-lg shadow-[8px_8px_0px_#4a5d73]">
            <h2 className="text-3xl mb-6 text-slate-900 font-bold">[퀘스트 슬롯 해금]</h2>
            <p className="text-2xl mb-8 leading-relaxed text-slate-800 font-bold">
              자리 해금에는 <span className="text-yellow-600">50,000골드</span>가 소비됩니다.<br/>
              하시겠습니까?
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => unlockQuestSlot(activeUnlockConfirm.deskId)}
                className="flex-1 py-5 bg-[#ffcc00] text-black border-b-4 border-r-4 border-[#cc9900] active:border-0 active:translate-y-1 transition-all text-2xl font-bold"
              >
                해금하기
              </button>
              <button 
                onClick={() => setUnlockConfirm(null)}
                className="flex-1 py-5 bg-[#6b859e] text-white border-b-4 border-r-4 border-[#3e5368] active:border-0 active:translate-y-1 transition-all text-2xl font-bold"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}