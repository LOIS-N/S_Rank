"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";
import client from "@/lib/axios";

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
      try {
        const token = useUserStore.getState().accessToken;
        const res = await client.post('/api/v1/quests/complete',
          { questId, questType },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.status !== 200) {
          setCompleteError(true);
          return;
        }
      } catch (e) {
        console.error('[CompleteQuest] API error:', e);
        setCompleteError(true);
        return;
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

  return (
    <>
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
              자리 해금에는 <span className="text-yellow-600">50,000골드</span>가 소비됩니다.<br/>
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
