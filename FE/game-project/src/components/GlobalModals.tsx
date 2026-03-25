"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";
import client from "@/lib/axios";
import { stopTutorialBgm } from "./BgmPlayer";
import TutorialQuestScript from "./TutorialQuestScript";
import TutorialQuestTimer from "./TutorialQuestTimer";
import TutorialCompleteOverlay from "./TutorialCompleteOverlay";

const CHAPTER_TITLES: Record<number, string> = {
  0: "예비 창업가",
  1: "스타트업",
  2: "씨드",
  3: "시리즈A",
  4: "시리즈B",
  5: "유니콘",
  6: "테크자이언트",
};

export default function GlobalModals() {
  const router = useRouter();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState(false);
  const { logout: privyLogout } = usePrivy();
  const {
    comingSoonModal, closeComingSoonModal,
    activeRewardModal, closeRewardModal,
    activeUnlockConfirm, setUnlockConfirm, unlockQuestSlot,
    questInfoModal, setQuestInfoModal,
    questFetchTrigger, setQuestFetchTrigger,
    completeQuestTrigger, setCompleteQuestTrigger,
    sessionExpiredModal, setSessionExpiredModal,
    logout: gameLogout,
    quests,
    tutorialActive, setTutorialActive,
    tutorialQuestStep, setTutorialQuestStep,
    setTutorialQuestScriptVisible, setTutorialGachaCount,
    tutorialQuestScriptVisible, tutorialScriptId, setTutorialScriptId,
    setTutorialAccessPage,
    tutorialQuestTimerActive, startTutorialQuestTimer, stopTutorialQuestTimer,
    tutorialQuestTimerReward, increaseGold,
    resetTutorialState,
  } = useGameStore();
  const { clearUser, accessToken } = useUserStore();

  const handleSessionExpiredConfirm = async () => {
    setSessionExpiredModal(false);
    clearUser();
    gameLogout();
    await privyLogout();
    router.push('/');
  };

  useEffect(() => {
    if (!questFetchTrigger) return;
    const { questId, questType, remainMs, endAt } = questFetchTrigger;
    setQuestFetchTrigger(null);

    const fetchQuestInfo = async () => {
      try {
        const token = useUserStore.getState().accessToken;
        const type = questType.toLowerCase();
        const res = await client.get(`/api/v1/quests/${type}`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { questId, type },
        });
        if (res.data.success && Array.isArray(res.data.data)) {
          const quest = res.data.data.find((q: any) => q.questId === questId);
          if (quest) {
            setQuestInfoModal({ questTitle: quest.title, rewardGold: quest.rewardGold, remainMs, endAt });
            return;
          }
        }
      } catch (e) {
        console.error('[QuestInfo] fetch error:', e);
      }
      setQuestInfoModal({ questTitle: '퀘스트 진행 중', rewardGold: 0, remainMs, endAt });
    };

    fetchQuestInfo();
  }, [questFetchTrigger]);

  useEffect(() => {
    if (!completeQuestTrigger) return;
    const { deskId, questId, questType } = completeQuestTrigger;
    setCompleteQuestTrigger(null);

    const doComplete = async () => {
      // 튜토리얼 퀘스트: questId < 0 → API 없이 처리
      if (questId < 0) {
        const { tutorialQuestStep: tStep, quests } = useGameStore.getState();
        const storeQ = quests.find(q => q.id === deskId);
        const reward = storeQ?.reward ?? 0;
        if (reward > 0) {
          useGameStore.getState().completeQuest(deskId); // 골드 지급 + 보상 모달
        } else {
          useGameStore.getState().completeQuestSilent(deskId);
        }
        if (tStep === 2) setTutorialScriptId('step2_done');
        else if (tStep === 32) setTutorialScriptId('step32_done');
        else if (tStep === 42) setTutorialQuestStep(99);
        return;
      }

      // Q008(아직 완료 시간 미도달) 자동 재시도 로직
      let retryCount = 0;
      while (retryCount <= 5) {
        try {
          const token = useUserStore.getState().accessToken;
          const res = await client.post('/api/v1/quests/complete',
            { questId, questType },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.status === 200) break; // 성공
          setCompleteError(true);
          return;
        } catch (e: any) {
          const code = e?.response?.data?.errorCode;
          if (code === 'Q008' && retryCount < 5) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          console.error('[CompleteQuest] API error:', e);
          setCompleteError(true);
          return;
        }
      }
      // 골드는 BE에서 받아서 갱신 (로컬 계산 제거 → 중복 지급 방지)
      try {
        const token = useUserStore.getState().accessToken;
        const profileRes = await client.get('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.data.success) {
          useGameStore.getState().setResources(
            profileRes.data.data.gold,
            profileRes.data.data.coin,
          );
        }
      } catch (e) {
        console.error('[CompleteQuest] profile fetch error:', e);
      }
      useGameStore.getState().completeQuestNoGold(deskId);
    };

    doComplete();
  }, [completeQuestTrigger]);

  const formatEndAt = (endAt: string | null): string => {
    if (!endAt) return '';
    const d = new Date(endAt);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${month}월 ${day}일 ${hour}시 ${min}분 완료`;
  };

  const formatRemainTime = (ms: number): string => {
    if (ms <= 0) return '완료';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };
  const handleUnlock = async () => {
    if (!activeUnlockConfirm) return;
    const deskId = activeUnlockConfirm.deskId;
    const deskTemplateId = deskId + 1;

    setIsUnlocking(true);
    setUnlockError(null);
    try {
      await client.post(`/api/v1/desks/${deskTemplateId}/unlock`, {}, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      unlockQuestSlot(deskId);
    } catch (error: any) {
      const message = error?.response?.data?.error?.message ?? '해금 중 오류가 발생했습니다.';
      setUnlockError(message);
      console.error('[Desks] Unlock error:', error);
    } finally {
      setIsUnlocking(false);
    }
  };

  const isTutorialActive = tutorialActive || tutorialQuestStep !== null;

  const handleTutorialQuit = () => {
    stopTutorialBgm();
    resetTutorialState();
    setTutorialGachaCount(0);
    router.push('/');
  };

  const handleScriptDone = () => {
    const scriptId = useGameStore.getState().tutorialScriptId;
    setTutorialScriptId(null);

    switch (scriptId) {
      case 'step0_init':
        setTimeout(() => setTutorialScriptId('step1_intro'), 300);
        break;
      case 'gacha_done':
        setTutorialGachaCount(0);
        setTutorialQuestStep(2);
        setTimeout(() => setTutorialScriptId('step2_intro'), 500);
        break;
      case 'step1_intro':
        setTutorialAccessPage('gacha');
        break;
      case 'step2_intro':
        setTutorialAccessPage('quest');
        break;
      case 'step2_done':
        setTutorialQuestStep(3);
        setTutorialAccessPage(null);
        setTimeout(() => {
          setTutorialScriptId('step3_intro');
        }, 500);
        break;
      case 'step3_intro':
        setTutorialAccessPage('quest');
        break;
      case 'step3_hard':
        setTutorialQuestStep(31);
        setTutorialAccessPage('enhance');
        break;
      case 'step31_done':
        setTutorialQuestStep(32);
        setTutorialAccessPage('quest');
        break;
      case 'step32_done':
        setTutorialQuestStep(4);
        setTutorialAccessPage(null);
        setTimeout(() => {
          setTutorialScriptId('step4_intro');
        }, 500);
        break;
      case 'step4_intro':
        setTutorialAccessPage('quest');
        break;
      case 'step4_missing':
        setTutorialQuestStep(41);
        setTutorialAccessPage('synthesis');
        break;
      case 'step41_done':
        setTutorialQuestStep(42);
        setTutorialAccessPage('quest');
        break;
      case 'step42_done':
        setTutorialQuestStep(99);
        break;
    }
  };

  const handleTimerComplete = () => {
    const step = useGameStore.getState().tutorialQuestStep;
    const reward = useGameStore.getState().tutorialQuestTimerReward;
    stopTutorialQuestTimer();
    if (reward > 0) increaseGold(reward);
    if (step === 2) {
      setTutorialScriptId('step2_done');
    } else if (step === 32) {
      setTutorialScriptId('step32_done');
    } else if (step === 42) {
      setTutorialQuestStep(99);
    }
  };

  return (
    <>
      {/* --- [DEV] 튜토리얼 quit 버튼 --- */}
      {isTutorialActive && (
        <div className="fixed z-[999] pointer-events-auto font-dot" style={{ top: "calc(var(--game-clip-y, 0px) + 1cqw)", right: "calc(1cqw)" }}>
          <button
            onClick={handleTutorialQuit}
            style={{
              background: "rgba(180,30,30,0.9)",
              border: "2px solid #ff6666",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "1.0cqw",
              padding: "0.4cqw 1.0cqw",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            [DEV] quit
          </button>
        </div>
      )}

      {/* Tutorial Quest Script Overlay (shows on all pages) */}
      {tutorialQuestScriptVisible && tutorialScriptId && (
        <div className="fixed inset-0 z-[300] pointer-events-none">
          <div className="absolute inset-0 pointer-events-auto">
            <TutorialQuestScript scriptId={tutorialScriptId} onDone={handleScriptDone} />
          </div>
        </div>
      )}

      {/* Tutorial Quest Timer — 게임 화면이 보이도록 pointer-events-none 유지 */}
      {tutorialQuestTimerActive && (
        <div className="fixed inset-0 z-[350] pointer-events-none">
          <TutorialQuestTimer onComplete={handleTimerComplete} />
        </div>
      )}

      {/* Tutorial Complete Overlay */}
      {tutorialQuestStep === 99 && (
        <div className="fixed inset-0 z-[500] pointer-events-none">
          <div className="absolute inset-0 pointer-events-auto">
            <TutorialCompleteOverlay onComplete={() => { stopTutorialBgm(); resetTutorialState(); }} />
          </div>
        </div>
      )}

      {/* --- Complete Quest Error Modal --- */}
      {completeError && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 font-dot pointer-events-auto" onClick={() => setCompleteError(false)}>
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-8 text-center max-w-sm shadow-[8px_8px_0px_#4a5d73]" onClick={e => e.stopPropagation()}>
            <p className="text-2xl mb-8 leading-relaxed text-slate-900 font-bold">
              에러가 발생했습니다.<br />잠시 후 다시 요청해주세요.
            </p>
            <button
              onClick={() => { setCompleteError(false); router.push('/'); }}
              className="w-full py-4 bg-[#ffcc00] text-black border-b-4 border-r-4 border-[#cc9900] active:border-0 active:translate-y-1 transition-all font-bold text-xl"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* --- Session Expired Modal --- */}
      {sessionExpiredModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 font-dot pointer-events-auto" onClick={handleSessionExpiredConfirm}>
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-10 text-center max-w-md shadow-[8px_8px_0px_#4a5d73]" onClick={e => e.stopPropagation()}>
            <h2 className="text-3xl mb-4 text-slate-900 font-bold">세션 만료</h2>
            <p className="text-xl mb-8 leading-relaxed text-slate-700 font-bold">
              로그인 세션이 만료되었습니다.<br/>다시 로그인해주세요.
            </p>
            <button
              onClick={handleSessionExpiredConfirm}
              className="w-full py-5 bg-[#ffcc00] text-black border-b-4 border-r-4 border-[#cc9900] active:border-0 active:translate-y-1 transition-all text-2xl font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* --- Coming Soon Modal --- */}
      {comingSoonModal?.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 font-dot pointer-events-auto" onClick={closeComingSoonModal}>
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-6 text-center max-w-sm shadow-[4px_4px_0px_#4a5d73]" onClick={e => e.stopPropagation()}>
            <p className="text-xl mb-6 leading-relaxed text-blue-700 font-bold">{comingSoonModal.text}</p>
            <button
              onClick={closeComingSoonModal}
              className="px-8 py-2 bg-[#ffcc00] text-black border-b-2 border-r-2 border-[#cc9900] active:border-0 active:translate-y-0.5 transition-all text-xl font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* --- Reward Modal --- */}
      {activeRewardModal?.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#8ea4b8]/80 font-dot pointer-events-auto" onClick={closeRewardModal}>
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-10 text-center max-w-md shadow-[8px_8px_0px_#4a5d73]" onClick={e => e.stopPropagation()}>
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

      {/* --- Quest Info Modal (캐릭터 클릭 시) --- */}
      {questInfoModal && (() => {
        const isCompleted = questInfoModal.endAt
          ? new Date(questInfoModal.endAt).getTime() <= Date.now()
          : questInfoModal.remainMs <= 0;
        return (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 font-dot pointer-events-auto" onClick={() => setQuestInfoModal(null)}>
            <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-10 text-center max-w-md shadow-[8px_8px_0px_#4a5d73]" onClick={e => e.stopPropagation()}>
              <h2 className="text-3xl mb-4 text-slate-900 font-bold">
                [{questInfoModal.questTitle}]
              </h2>
              {!isCompleted && questInfoModal.remainMs > 0 && (
                <p className="text-2xl mb-2 text-blue-700 font-bold">
                  남은 시간: {formatRemainTime(questInfoModal.remainMs)}
                </p>
              )}
              {questInfoModal.endAt && (
                <p className="text-xl mb-2 text-slate-600 font-bold">
                  {formatEndAt(questInfoModal.endAt)}
                </p>
              )}
              {questInfoModal.rewardGold > 0 && (
                <p className="text-2xl mb-8 text-yellow-600 font-bold">
                  예상 보상: {questInfoModal.rewardGold.toLocaleString()} 골드
                </p>
              )}
              <button
                onClick={() => setQuestInfoModal(null)}
                className="w-full py-5 bg-[#ffcc00] text-black border-b-4 border-r-4 border-[#cc9900] active:border-0 active:translate-y-1 transition-all text-2xl font-bold"
              >
                확인
              </button>
            </div>
          </div>
        );
      })()}

      {/* --- Unlock Confirm Modal --- */}
      {activeUnlockConfirm?.isOpen && (() => {
        const deskQuest = quests.find(q => q.id === activeUnlockConfirm.deskId);
        const reqLevel = deskQuest?.requiredLevel ?? 0;
        const reqTitle = CHAPTER_TITLES[reqLevel];
        const unlockCost = deskQuest?.unlockCostGold ?? 50000;
        return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#8ea4b8]/80 font-dot pointer-events-auto" onClick={() => { setUnlockConfirm(null); setUnlockError(null); }}>
          <div className="bg-[#b0c4de] border-4 border-[#6b859e] p-10 text-center max-w-lg shadow-[8px_8px_0px_#4a5d73]" onClick={e => e.stopPropagation()}>
            <h2 className="text-3xl mb-6 text-slate-900 font-bold">[퀘스트 슬롯 해금]</h2>
            {reqLevel > 0 && reqTitle && (
              <p className="text-xl mb-3 text-slate-800 font-bold">
                해금 조건: <span className="text-red-600">레벨 {reqLevel}: {reqTitle}</span> 이상
              </p>
            )}
            <p className="text-2xl mb-4 leading-relaxed text-slate-800 font-bold">
              자리 해금에는 <span className="text-yellow-600">{unlockCost.toLocaleString()}골드</span>가 소비됩니다.<br/>
              하시겠습니까?
            </p>
            {unlockError && (
              <p className="text-xl mb-4 text-red-600 font-bold">{unlockError}</p>
            )}
            <div className="flex gap-4">
              <button
                onClick={handleUnlock}
                disabled={isUnlocking}
                className="flex-1 py-5 bg-[#ffcc00] text-black border-b-4 border-r-4 border-[#cc9900] active:border-0 active:translate-y-1 transition-all text-2xl font-bold disabled:opacity-50"
              >
                {isUnlocking ? "해금 중..." : "해금하기"}
              </button>
              <button
                onClick={() => { setUnlockConfirm(null); setUnlockError(null); }}
                disabled={isUnlocking}
                className="flex-1 py-5 bg-[#6b859e] text-white border-b-4 border-r-4 border-[#3e5368] active:border-0 active:translate-y-1 transition-all text-2xl font-bold disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </>
  );
}
