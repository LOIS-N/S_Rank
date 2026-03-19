"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";
import client from "@/lib/axios";

export default function GlobalModals() {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const {
    comingSoonModal, closeComingSoonModal,
    activeRewardModal, closeRewardModal,
    activeUnlockConfirm, setUnlockConfirm, unlockQuestSlot,
  } = useGameStore();
  const { accessToken } = useUserStore();

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
      {/* --- Coming Soon Modal --- */}
      {comingSoonModal?.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 font-dot pointer-events-auto">
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-6 text-center max-w-sm shadow-[4px_4px_0px_#4a5d73]">
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#8ea4b8]/80 font-dot pointer-events-auto">
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

      {/* --- Unlock Confirm Modal --- */}
      {activeUnlockConfirm?.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#8ea4b8]/80 font-dot pointer-events-auto">
          <div className="bg-[#b0c4de] border-4 border-[#6b859e] p-10 text-center max-w-lg shadow-[8px_8px_0px_#4a5d73]">
            <h2 className="text-3xl mb-6 text-slate-900 font-bold">[퀘스트 슬롯 해금]</h2>
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
      )}
    </>
  );
}
