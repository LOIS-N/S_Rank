"use client";

import { useGameStore } from "@/store/useGameStore";

export default function GlobalModals() {
  const { 
    comingSoonModal, closeComingSoonModal,
    activeRewardModal, closeRewardModal,
    activeUnlockConfirm, setUnlockConfirm, unlockQuestSlot
  } = useGameStore();

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
    </>
  );
}
