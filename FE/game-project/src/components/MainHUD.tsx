"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import MyPageModal from "./modals/MyPageModal";
import RankingModal from "./modals/RankingModal";
import DiscordModal from "./modals/DiscordModal";
import NotificationModal from "./modals/NotificationModal";
import AchievementModal from "./modals/AchievementModal";

// cqw 기준: game-wrapper 너비의 1% (1280px 기준 → 12.8px = 1cqw)

export default function MainHUD() {
  const { gold, coffee, unreadNotifications, nickname } = useGameStore();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 pointer-events-none font-dot flex flex-col justify-between select-none">

      {/* --- 상단 바 --- */}
      <div className="w-full bg-[#8ea4b8] border-b-[3px] border-[#6b859e] pointer-events-auto shadow-md">
        <div className="w-full mx-auto flex flex-row justify-between items-center bg-[#b0c4de]/40"
          style={{ padding: "0.9cqw" }}>

          {/* 왼쪽: 타이틀 + 닉네임 + 골드/커피 */}
          <div className="flex items-center" style={{ paddingLeft: "1.25cqw" }}>
            <div className="font-bold text-white drop-shadow-[2px_2px_0px_#000] flex items-center gap-2"
              style={{ fontSize: "1.36cqw", marginRight: "1.9cqw" }}>
              <span>S급 개발자들이 나를 따르는 이유</span>
              <span className="text-yellow-400 mx-2">|</span>
              <span className="text-white bg-black/20 px-3 py-1 rounded border border-white/30">
                {nickname || "유저"}
              </span>
            </div>

            {/* Gold Container — 너비 10% 축소: 17.5 → 15.75cqw, 아이콘 20% 축소: 5 → 4cqw */}
            <div className="relative flex items-center"
              style={{ height: "4.7cqw", width: "15.75cqw" }}>
              <div
                className="absolute right-0 top-0 bottom-0 text-black font-bold flex items-center justify-end"
                style={{
                  left: "2.5cqw",
                  paddingRight: "1.9cqw",
                  fontSize: "1.36cqw",
                  backgroundImage: "url('/assets/002/upperBlank_002.png')",
                  backgroundSize: "100% 100%",
                }}
              >
                <span className="tabular-nums">{gold.toLocaleString()}</span>
                <span style={{ marginLeft: "0.4cqw", fontSize: "1.12cqw" }}>G</span>
              </div>
              <img
                src="/assets/002/coin_002.png" alt="gold"
                className="absolute z-10"
                style={{ left: "-1.5cqw", top: "0.5cqw", width: "4cqw", height: "4cqw", imageRendering: "pixelated" }}
              />
            </div>

            {/* Coffee Container — 너비 10% 축소: 17.5 → 15.75cqw, 아이콘 20% 축소: 5 → 4cqw */}
            <div className="relative flex items-center"
              style={{ height: "4.7cqw", width: "15.75cqw", marginLeft: "1.25cqw" }}>
              <div
                className="absolute right-0 top-0 bottom-0 text-black font-bold flex items-center justify-end"
                style={{
                  left: "2.5cqw",
                  paddingRight: "1.9cqw",
                  fontSize: "1.36cqw",
                  backgroundImage: "url('/assets/002/upperBlank_002.png')",
                  backgroundSize: "100% 100%",
                }}
              >
                <span className="tabular-nums">{coffee.toLocaleString()}</span>
                <span style={{ marginLeft: "0.4cqw", fontSize: "1.12cqw" }}>잔</span>
              </div>
              <img
                src="/assets/002/coffee_002.png" alt="coffee"
                className="absolute z-10"
                style={{ left: "-1.5cqw", top: "0.5cqw", width: "4cqw", height: "4cqw", imageRendering: "pixelated" }}
              />
            </div>
          </div>

          {/* 오른쪽: 아이콘 버튼들 */}
          <div className="flex" style={{ gap: "1.25cqw", paddingRight: "1.25cqw" }}>
            {[
              { id: "mypage",       icon: "/assets/002/mypage_002.png",   label: "마이페이지" },
              { id: "ranking",      icon: "/assets/002/ranking_002.png",  label: "랭킹" },
              { id: "discord",      icon: "/assets/002/discord_002.png",  label: "디스코드" },
              { id: "notification", icon: "/assets/002/message_002.png",  label: "알림" },
              { id: "achievement",  icon: "/assets/002/awards_002.png",   label: "업적" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveModal(item.id)}
                className="relative flex items-center justify-center shadow-[1px_1px_0px_#000] active:translate-y-0.5 transition-all hover:brightness-110"
                style={{
                  width: "5cqw",
                  height: "5cqw",
                  backgroundImage: "url('/assets/002/upperButton_002.png')",
                  backgroundSize: "100% 100%",
                }}
                title={item.label}
              >
                <img
                  src={item.icon} alt={item.label}
                  style={{ width: "3.1cqw", height: "3.1cqw", imageRendering: "pixelated" }}
                />
                {item.id === "notification" && unreadNotifications > 0 && (
                  <div
                    className="absolute bg-red-600 rounded-full border-2 border-[#b0c4de]"
                    style={{ top: "-0.3cqw", right: "-0.3cqw", width: "1.6cqw", height: "1.6cqw" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- 모달 영역 ---
          activeModal이 열려있을 때 inset-0 full 오버레이로 canvas 클릭 차단 */}
      {activeModal && (
        <div className="absolute inset-0 z-[90] pointer-events-auto">
          {activeModal === "mypage"        && <MyPageModal        onClose={() => setActiveModal(null)} />}
          {activeModal === "ranking"       && <RankingModal       onClose={() => setActiveModal(null)} />}
          {activeModal === "discord"       && <DiscordModal       onClose={() => setActiveModal(null)} />}
          {activeModal === "notification"  && <NotificationModal  onClose={() => setActiveModal(null)} />}
          {activeModal === "achievement"   && <AchievementModal   onClose={() => setActiveModal(null)} />}
        </div>
      )}

      <div className="flex-1" />
    </div>
  );
}
