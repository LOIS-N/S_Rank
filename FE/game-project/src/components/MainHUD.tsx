"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";
import api from "@/lib/axios";
import MyPageModal from "./modals/MyPageModal";
import RankingModal from "./modals/RankingModal";
import DiscordModal from "./modals/DiscordModal";
import NotificationModal from "./modals/NotificationModal";
import AchievementModal from "./modals/AchievementModal";
import { toggleBgm, isBgmMuted, playQuestTutorialBgm } from "./BgmPlayer";
import TutorialStory from "./TutorialStory";

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
  const {
    gold, coffee, nickname, openComingSoonModal, setHUDModalOpen, bugsEnabled, toggleBugs,
    tutorialActive, setTutorialActive,
    tutorialQuestStep, setTutorialQuestStep,
    setTutorialGachaCount, setTutorialScriptId,
    resetTutorialState,
    quests,
  } = useGameStore();
  const { accessToken, level: userLevel } = useUserStore();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [bgmMuted, setBgmMuted] = useState(() => isBgmMuted());
  const [chapterNo, setChapterNo] = useState<number | null>(null);
  const [stepNo, setStepNo] = useState<number | null>(null);
  // 스토리 → 게임 페이드인 오버레이
  const [revealPhase, setRevealPhase] = useState<'hidden' | 'black' | 'fadein'>('hidden');
  const revealRafRef = useRef<number | null>(null);

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
          return;
        }

        // IN_PROGRESS도 null도 없으면 (전부 COMPLETE/CLAIMED) 뱃지 숨김
        setChapterNo(null);
        setStepNo(null);
      } catch {
        // 조용히 실패
      }
    };
    fetch();
  }, [accessToken]);

  // 튜토리얼 스토리 완료 → 페이드인 오버레이 후 step1 시작
  const handleTutorialStoryComplete = () => {
    setRevealPhase('black');  // 즉시 검정 오버레이 (TutorialStory 제거와 동시에 빈틈 없이 가림)
    playQuestTutorialBgm();   // 스토리 BGM 종료 후 튜토리얼 퀘스트 BGM 시작
    setTutorialActive(false);
    setTutorialGachaCount(0);
    setTutorialQuestStep(1);
    setTutorialScriptId('step0_init');
    // 2프레임 후 fade-out 시작
    revealRafRef.current = requestAnimationFrame(() => {
      revealRafRef.current = requestAnimationFrame(() => {
        setRevealPhase('fadein');
      });
    });
  };

  const openModal = (id: string) => {
    setActiveModal(id);
    setHUDModalOpen(true);
  };

  const closeModal = () => {
    setActiveModal(null);
    setHUDModalOpen(false);
  };

  const chapterTitle = chapterNo != null ? CHAPTER_TITLES[chapterNo] ?? null : null;
  const chapterIcon = chapterNo != null ? CHAPTER_ICONS[chapterNo] ?? "✨" : null;

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
                  <span className="text-yellow-300 font-bold">{userLevel}-{stepNo}</span>
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
                <span className="tabular-nums">{(tutorialQuestStep !== null ? 0 : gold).toLocaleString()}</span>
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
              { id: "mypage", icon: `${ASSET_BASE}/assets/002/mypage_002.webp`, label: "마이페이지", comingSoon: false },
              { id: "ranking", icon: `${ASSET_BASE}/assets/002/ranking_002.webp`, label: "랭킹", comingSoon: false },
              { id: "discord", icon: `${ASSET_BASE}/assets/002/discord_002.webp`, label: "디스코드", comingSoon: false },
              { id: "notification", icon: `${ASSET_BASE}/assets/002/message_002.webp`, label: "알림", comingSoon: true },
              { id: "achievement", icon: `${ASSET_BASE}/assets/002/awards_002.webp`, label: "업적", comingSoon: true },
            ].map((item) => {
              const isTutorialDisabled = tutorialQuestStep !== null;
              const isDisabled = item.comingSoon || isTutorialDisabled;
              return (
                <button
                  key={item.id}
                  onClick={isTutorialDisabled
                    ? () => openComingSoonModal("튜토리얼 진행 후 이용 가능합니다.")
                    : item.comingSoon ? () => openComingSoonModal() : () => openModal(item.id)
                  }
                  className="relative flex items-center justify-center transition-all"
                  style={{
                    width: "4cqw",
                    height: "4cqw",
                    backgroundImage: `url('${ASSET_BASE}/assets/002/upperButton_002.webp')`,
                    backgroundSize: "100% 100%",
                    filter: isDisabled ? "brightness(0.5)" : undefined,
                    cursor: isDisabled ? "default" : "pointer",
                  }}
                  title={item.label}
                >
                  <img
                    src={item.icon} alt={item.label}
                    style={{ width: "2.48cqw", height: "2.48cqw", imageRendering: "pixelated" }}
                  />
                </button>
              );
            })}

          </div>
        </div>
      </div>

      {/* --- 상단 바 아래 가이드 + BGM + debug 버튼 --- */}
      <div className="w-full flex items-center pointer-events-auto" style={{ paddingLeft: "1.0cqw", paddingRight: "1.0cqw", paddingTop: "0.5cqw", gap: "0.5cqw" }}>
        {/* 가이드 버튼 */}
        <button
          onClick={() => openModal('guide')}
          className="relative flex items-center justify-center active:translate-y-0.5 transition-all hover:brightness-110"
          style={{
            width: "4cqw",
            height: "4cqw",
            backgroundImage: `url('${ASSET_BASE}/assets/002/upperButton_002.webp')`,
            backgroundSize: "100% 100%",
          }}
          title="게임 가이드"
        >
          <span style={{ fontSize: "2.0cqw", fontWeight: "bold", color: "#ffffff", textShadow: "1px 1px 0 #000, -1px -1px 0 #000" }}>?</span>
        </button>

        <div style={{ flex: 1 }} />

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
        {/* Debug 토글 버튼 */}
        <button
          onClick={tutorialQuestStep !== null ? undefined : toggleBugs}
          className="relative flex items-center justify-center transition-all"
          style={{
            width: "4cqw",
            height: "4cqw",
            backgroundImage: `url('${ASSET_BASE}/assets/002/upperButton_002.webp')`,
            backgroundSize: "100% 100%",
            filter: (!bugsEnabled || tutorialQuestStep !== null) ? "brightness(0.5)" : undefined,
            cursor: tutorialQuestStep !== null ? "default" : "pointer",
          }}
          title={bugsEnabled ? "버그 비활성화" : "버그 활성화"}
        >
          <img
            src={`${ASSET_BASE}/assets/002/debug.webp`}
            alt="debug"
            style={{ width: "2.48cqw", height: "2.48cqw", imageRendering: "pixelated" }}
          />
        </button>
        {/* 튜토리얼 시작 / 스킵 버튼 */}
        <button
          onClick={tutorialQuestStep !== null ? resetTutorialState : () => setTutorialActive(true)}
          className="relative flex items-center justify-center transition-all hover:brightness-110 font-dot"
          style={{
            width: "4cqw",
            height: "4cqw",
            backgroundImage: `url('${ASSET_BASE}/assets/002/upperButton_002.webp')`,
            backgroundSize: "100% 100%",
            fontSize: "1.3cqw",
            fontWeight: "bold",
            color: tutorialQuestStep !== null ? "#ffdd88" : "#fff",
            textShadow: "1px 1px 0 #000, -1px -1px 0 #000",
          }}
          title={tutorialQuestStep !== null ? "튜토리얼 스킵" : "튜토리얼 시작"}
        >
          {tutorialQuestStep !== null ? "스킵" : "튜토"}
        </button>
      </div>

      {/* --- 모달 영역 --- */}
      {activeModal && (
        <div className="absolute inset-0 z-[90] pointer-events-auto" onPointerDown={e => e.stopPropagation()}>
          {activeModal === "mypage" && <MyPageModal onClose={closeModal} />}
          {activeModal === "ranking" && <RankingModal onClose={closeModal} />}
          {activeModal === "discord" && <DiscordModal onClose={closeModal} />}
          {activeModal === "notification" && <NotificationModal onClose={closeModal} />}
          {activeModal === "achievement" && <AchievementModal onClose={closeModal} />}
          {activeModal === "guide" && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center font-dot pointer-events-auto pb-[calc(6cqw+10px)]"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={closeModal}
              onPointerDown={e => e.stopPropagation()}
            >
              <div
                className="relative flex flex-col"
                style={{
                  background: '#b0c4de',
                  border: '4px solid #6b859e',
                  width: '600px',
                  maxWidth: '90%',
                  height: '550px',
                  maxHeight: '85%',
                  boxShadow: '8px 8px 0px #4a5d73',
                }}
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
              >
                {/* 헤더 */}
                <div style={{ padding: '1.2cqw 2cqw 0.8cqw', borderBottom: '2px solid #6b859e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <span style={{ fontSize: '2.0cqw', fontWeight: 'bold', color: '#0a1520' }}>게임 가이드</span>
                  <button onClick={closeModal} style={{ fontSize: '2.2cqw', color: '#fff', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }} title="닫기">&times;</button>
                </div>
                {/* 스크롤 본문 */}
                <div style={{ overflowY: 'auto', padding: '1.2cqw 2cqw 1.5cqw', fontSize: '1.4cqw', color: '#0a1520', lineHeight: 1.8 }}>
                  {[
                    { title: '게임 소개', body: '<S급 개발자들이 나를 따르는 이유>는 어느날 개발 능력치가 보이게 된 사용자가 직원들을 고용해, 자신만의 스타트업을 꾸려가는 스토리의 게임입니다. 뽑기, 강화, 성장 등의 확률성 컨텐츠들을 통해 보다 강한 직원들을 모아 퀘스트를 진행해보세요.' },
                    { title: '레벨', body: '레벨 1. 스타트업\n레벨 2. 씨드\n레벨 3. 시리즈A\n레벨 4. 시리즈B\n레벨 5. 유니콘\n레벨 6. 테크 자이언트\n\n해당 레벨에 배치된 메인 퀘스트를 모두 수행 시 다음 레벨로 넘어갈 수 있습니다. 레벨에 따라 해금할 수 있는 책상의 갯수와 뽑기 단계가 달라집니다.' },
                    { title: '골드', body: '골드는 퀘스트 수행과 버그 잡기를 통해 얻을 수 있는 재화입니다. 골드를 통해 뽑기, 강화, 합성 등의 컨텐츠를 즐길 수 있습니다.' },
                    { title: '카드', body: '카드 한 장은 개발자 한 명을 의미합니다. 스탯은 FE, BE, AI, DBA, Devops, Design 총 여섯가지가 있습니다. 카드는 랜덤하게 다음 6가지 스탯 중 3가지를 가지게 됩니다. S등급 카드의 경우 랜덤하게 특별한 스킬을 가지기도 합니다. [해고하기] 버튼을 통해 사용하지 않는 카드를 판매할 수 있습니다.' },
                    { title: '퀘스트', body: '퀘스트는 하나의 프로젝트입니다. 퀘스트별로 요구하는 스테이터스가 다릅니다. 기술스택 필터링 버튼, 정렬, 자동선택 버튼을 통해 보다 간편하게 프로젝트를 수행할 수 있습니다.' },
                    { title: '뽑기', body: '전단지, 박람회, 공채 총 세 단계의 뽑기가 있습니다. 단계별로 뽑을 수 있는 카드의 등급과 비율이 달라집니다.' },
                    { title: '강화', body: '기존의 카드 성능을 강화할 수 있습니다. 카드 한 장 당 총 7번의 강화가 가능합니다. 강화 성공 확률은 등급에 따라 다릅니다. 강화 성공 횟수가 많아질수록 강화되는 능력치의 총합도 늘어납니다.' },
                    { title: '합성', body: '기존 카드를 2장에서 5장까지 모아 합성할 수 있습니다. 합성은 같은 등급의 카드들로만 가능하며, 성공 시 바로 윗단계의 카드를 랜덤하게 뽑을 수 있습니다. S등급 카드의 경우 2장만 합성 가능하며, 100% 확률로 S등급의 카드를 얻을 수 있습니다.' },
                    { title: '버그', body: '유저의 회사 내부에는 끊임없이 버그들이 출몰합니다. 일반 버그는 마리당 50골드, 특별한 버그는 마리당 100골드를 지급합니다. 우측 상단의 버튼을 통해 비활성화가 가능합니다.' },
                  ].map(({ title, body }) => (
                    <div key={title} style={{ marginBottom: '1.2cqw' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.5cqw', color: '#071830', marginBottom: '0.3cqw', borderBottom: '2px solid #6b859e', paddingBottom: '0.2cqw' }}>{title}</div>
                      <div style={{ whiteSpace: 'pre-line' }}>{body}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: '1.2cqw', paddingTop: '0.8cqw', borderTop: '1px solid #8ea4b8', fontSize: '1.3cqw', color: '#0a1e38' }}>
                    문의사항, 에러가 있을 경우 아래 디스코드 채널의 문의사항 게시판을 이용해주세요.<br />
                    <a href="https://discord.com/invite/vVtweyat" target="_blank" rel="noopener noreferrer" style={{ color: '#2a5ab8', textDecoration: 'underline', wordBreak: 'break-all' }}>https://discord.com/invite/vVtweyat</a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* ── 튜토리얼 result 화살표: 퀘스트 완료 후 책상 결과 아이콘 안내 ── */}
      {tutorialQuestStep !== null && [2, 32, 42].includes(tutorialQuestStep) && quests[0]?.status === 'COMPLETED' && (
        <img
          src={`${ASSET_BASE}/assets/tutorial/arrow.webp`}
          alt=""
          className="tutorial-arrow-y"
          style={{
            position: 'absolute',
            top: '24cqw',
            left: '56.5cqw',
            transform: 'translateX(-50%)',
            height: '4.7cqw',
            width: 'auto',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />
      )}

      {/* ── 튜토리얼 스토리 오버레이 ── */}
      {tutorialActive && (
        <TutorialStory onComplete={handleTutorialStoryComplete} />
      )}

      {/* ── 스토리→게임 전환 페이드인 오버레이 ── */}
      {revealPhase !== 'hidden' && (
        <div
          onTransitionEnd={() => setRevealPhase('hidden')}
          style={{
            position: 'absolute', inset: 0,
            background: 'black',
            opacity: revealPhase === 'black' ? 1 : 0,
            transition: revealPhase === 'fadein' ? 'opacity 0.85s ease-out' : 'none',
            zIndex: 199,
            pointerEvents: 'none',
          }}
        />
      )}

    </div>
  );
}
