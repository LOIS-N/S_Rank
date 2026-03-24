"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";
import api from "@/lib/axios";
import MyPageModal from "./modals/MyPageModal";
import RankingModal from "./modals/RankingModal";
import DiscordModal from "./modals/DiscordModal";
import NotificationModal from "./modals/NotificationModal";
import AchievementModal from "./modals/AchievementModal";
import { toggleBgm, isBgmMuted } from "./BgmPlayer";

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// cqw 기준: game-wrapper 너비의 1% (1280px 기준 → 12.8px = 1cqw)

const CHAPTER_TITLES: Record<number, string> = {
  0: "예비 창업가",
  1: "스타트업",
  2: "씨드",
  3: "시리즈A",
  4: "시리즈B",
  5: "유니콘",
  6: "테크자이언트",
};

const CHAPTER_ICONS: Record<number, string> = {
  0: "🌱",
  1: "🚀",
  2: "💡",
  3: "📈",
  4: "💰",
  5: "🦄",
  6: "🏢",
};

interface MainQuestItem {
  questId: number;
  chapterNo: number;
  stepNo: number;
  status: string | null;
}

export default function MainHUD() {
  const { gold, coffee, nickname, openComingSoonModal, setHUDModalOpen } = useGameStore();
  const { accessToken } = useUserStore();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [bgmMuted, setBgmMuted] = useState(() => isBgmMuted());
  const [chapterNo, setChapterNo] = useState<number | null>(null);
  const [stepNo, setStepNo] = useState<number | null>(null);

  // 메인 퀘스트 API 호출 → 현재 챕터/스텝 계산
  useEffect(() => {
    if (!accessToken) return;
    const fetch = async () => {
      try {
        const { data: json } = await api.get('/api/v1/quests/main', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!json.success || !Array.isArray(json.data) || json.data.length === 0) return;

        const quests: MainQuestItem[] = json.data;

        // IN_PROGRESS인 퀘스트 우선
        const inProgress = quests.find(q => q.status === 'IN_PROGRESS');
        if (inProgress) {
          setChapterNo(inProgress.chapterNo);
          setStepNo(inProgress.stepNo);
          return;
        }

        // 없으면 status가 null인 것 중 stepNo 가장 작은 것
        const nullQuests = quests.filter(q => q.status === null);
        if (nullQuests.length > 0) {
          const smallest = nullQuests.reduce((a, b) => a.stepNo < b.stepNo ? a : b);
          setChapterNo(smallest.chapterNo);
          setStepNo(smallest.stepNo);
        }
      } catch {
        // 조용히 실패
      }
    };
    fetch();
  }, [accessToken]);

  const openModal = (id: string) => {
    setActiveModal(id);
    setHUDModalOpen(true);
  };

  const closeModal = () => {
    setActiveModal(null);
    setHUDModalOpen(false);
  };

  const chapterTitle = chapterNo != null ? CHAPTER_TITLES[chapterNo] ?? null : null;
  const chapterIcon  = chapterNo != null ? CHAPTER_ICONS[chapterNo]  ?? "✨" : null;

  return (
    <div className="absolute left-0 right-0 pointer-events-none font-dot flex flex-col justify-between select-none" style={{ top: "var(--game-clip-y, 0px)", bottom: "var(--game-clip-y, 0px)" }}>

      {/* --- 상단 바 --- */}
      <div className="w-full bg-[#8ea4b8] border-b-[3px] border-[#6b859e] pointer-events-auto shadow-md">
        <div className="w-full mx-auto flex flex-row items-center bg-[#b0c4de]/40"
          style={{ padding: "0.9cqw" }}>

          {/* 왼쪽: 타이틀 + 닉네임 + 레벨/칭호 */}
          <div className="flex items-center" style={{ paddingLeft: "1.25cqw" }}>
            <div className="font-bold text-white drop-shadow-[2px_2px_0px_#000] flex items-center gap-2"
              style={{ fontSize: "1.36cqw" }}>
              <span>S급 개발자들이 나를 따르는 이유</span>
              <span className="text-yellow-400 mx-2">|</span>
              <span className="text-white bg-black/20 rounded border border-white/30"
                style={{ paddingLeft: "0.6cqw", paddingRight: "0.6cqw", paddingTop: "0.2cqw", paddingBottom: "0.2cqw" }}>
                {nickname || "유저"} 님
              </span>
              {chapterNo != null && stepNo != null && chapterTitle && (
                <span
                  className="flex items-center gap-1 text-yellow-200 bg-black/30 rounded border border-yellow-400/50"
                  style={{ paddingLeft: "0.5cqw", paddingRight: "0.6cqw", paddingTop: "0.15cqw", paddingBottom: "0.15cqw", fontSize: "1.1cqw" }}
                >
                  <span style={{ fontSize: "1.2cqw" }}>{chapterIcon}</span>
                  <span className="text-yellow-300 font-bold">{chapterNo}-{stepNo}</span>
                  <span className="text-white/80">:</span>
                  <span>{chapterTitle}</span>
                </span>
              )}
            </div>
          </div>

          {/* 중앙: 골드/커피 */}
          <div className="flex-1 flex items-center justify-center" style={{ gap: "1.0cqw" }}>
            {/* Gold Container */}
            <div className="relative flex items-center"
              style={{ height: "3.76cqw", width: "12.6cqw" }}>
              <div
                className="absolute right-0 top-0 bottom-0 text-black font-bold flex items-center justify-end overflow-hidden"
                style={{
                  left: "1.6cqw",
                  paddingRight: "0.8cqw",
                  paddingLeft: "0.4cqw",
                  fontSize: "1.2cqw",
                  backgroundImage: `url('${ASSET_BASE}/assets/002/upperBlank_002.webp')`,
                  backgroundSize: "100% 100%",
                }}
              >
                <span className="tabular-nums">{gold.toLocaleString()}</span>
                <span style={{ marginLeft: "0.32cqw", fontSize: "1.12cqw" }}>G</span>
              </div>
              <img
                src={`${ASSET_BASE}/assets/002/coin_002.webp`} alt="gold"
                className="absolute z-10"
                style={{ left: "-0.96cqw", top: "0.6cqw", width: "2.56cqw", height: "2.56cqw", imageRendering: "pixelated" }}
              />
            </div>

            {/* Coffee Container */}
            <div className="relative flex items-center"
              style={{ height: "3.76cqw", width: "12.6cqw" }}>
              <div
                className="absolute right-0 top-0 bottom-0 text-black font-bold flex items-center justify-end overflow-hidden"
                style={{
                  left: "1.6cqw",
                  paddingRight: "0.8cqw",
                  paddingLeft: "0.4cqw",
                  fontSize: "1.2cqw",
                  backgroundImage: `url('${ASSET_BASE}/assets/002/upperBlank_002.webp')`,
                  backgroundSize: "100% 100%",
                }}
              >
                <span className="tabular-nums">{coffee.toLocaleString()}</span>
                <span style={{ marginLeft: "0.32cqw", fontSize: "1.12cqw" }}>잔</span>
              </div>
              <img
                src={`${ASSET_BASE}/assets/002/coffee_002.webp`} alt="coffee"
                className="absolute z-10"
                style={{ left: "-0.96cqw", top: "0.6cqw", width: "2.56cqw", height: "2.56cqw", imageRendering: "pixelated" }}
              />
            </div>
          </div>

          {/* 오른쪽: 아이콘 버튼들 */}
          <div className="flex" style={{ gap: "1.0cqw", paddingRight: "1.0cqw" }}>
            {[
              { id: "mypage",       icon: `${ASSET_BASE}/assets/002/mypage_002.webp`,   label: "마이페이지", comingSoon: false },
              { id: "ranking",      icon: `${ASSET_BASE}/assets/002/ranking_002.webp`,  label: "랭킹",       comingSoon: false },
              { id: "discord",      icon: `${ASSET_BASE}/assets/002/discord_002.webp`,  label: "디스코드",   comingSoon: false },
              { id: "notification", icon: `${ASSET_BASE}/assets/002/message_002.webp`,  label: "알림",       comingSoon: false },
              { id: "achievement",  icon: `${ASSET_BASE}/assets/002/awards_002.webp`,   label: "업적",       comingSoon: false },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => item.comingSoon ? openComingSoonModal() : openModal(item.id)}
                className="relative flex items-center justify-center active:translate-y-0.5 transition-all hover:brightness-110"
                style={{
                  width: "4cqw",
                  height: "4cqw",
                  backgroundImage: `url('${ASSET_BASE}/assets/002/upperButton_002.webp')`,
                  backgroundSize: "100% 100%",
                  filter: item.comingSoon ? "brightness(0.6)" : undefined,
                }}
                title={item.label}
              >
                <img
                  src={item.icon} alt={item.label}
                  style={{ width: "2.48cqw", height: "2.48cqw", imageRendering: "pixelated" }}
                />
              </button>
            ))}

            {/* BGM 토글 버튼 */}
            <button
              onClick={() => setBgmMuted(toggleBgm())}
              className="relative flex items-center justify-center active:translate-y-0.5 transition-all hover:brightness-110"
              style={{
                width: "4cqw",
                height: "4cqw",
                backgroundImage: `url('${ASSET_BASE}/assets/002/upperButton_002.webp')`,
                backgroundSize: "100% 100%",
                filter: bgmMuted ? "brightness(0.6)" : undefined,
              }}
              title={bgmMuted ? "BGM 켜기" : "BGM 끄기"}
            >
              <img
                src={`${ASSET_BASE}/assets/002/audio.webp`}
                alt="BGM"
                style={{ width: "4.43cqw", height: "4.43cqw", imageRendering: "pixelated" }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* --- 모달 영역 --- */}
      {activeModal && (
        <div className="absolute inset-0 z-[90] pointer-events-auto">
          {activeModal === "mypage"        && <MyPageModal        onClose={closeModal} />}
          {activeModal === "ranking"       && <RankingModal       onClose={closeModal} />}
          {activeModal === "discord"       && <DiscordModal       onClose={closeModal} />}
          {activeModal === "notification"  && <NotificationModal  onClose={closeModal} />}
          {activeModal === "achievement"   && <AchievementModal   onClose={closeModal} />}
        </div>
      )}

      <div className="flex-1" />
    </div>
  );
}
