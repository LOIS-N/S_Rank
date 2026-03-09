"use client";

import { useGameStore } from "@/store/useGameStore";

export default function UIOverlay() {
  const { score, resetScore, nickname, gameStatus } = useGameStore();

  // 게임 플레이 중이 아니면 UI를 숨깁니다.
  if (gameStatus !== 'PLAYING') return null;

  return (
    <div className="absolute inset-0 pointer-events-none p-6 select-none">
      <div className="flex justify-between items-start w-full">
        
        {/* 왼쪽 상단: 플레이어 정보 (도트 박스 스타일) */}
        <div className="font-dot bg-black/80 border-4 border-white p-4 shadow-[4px_4px_0px_#000]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 animate-pulse border border-black" />
            <p className="text-slate-300 text-sm tracking-tighter">PLAYER: {nickname || 'GUEST'}</p>
          </div>
          <div className="flex flex-col">
            <p className="text-slate-400 text-xs mb-1">CURRENT SCORE</p>
            <p className="text-white text-4xl font-bold tracking-widest tabular-nums">
              {score.toLocaleString().padStart(6, '0')}
            </p>
          </div>
        </div>

        {/* 오른쪽 상단: 컨트롤 버튼 (클릭 가능하게 pointer-events-auto 설정) */}
        <div className="flex flex-col gap-3 items-end">
          <button
            onClick={resetScore}
            className="pointer-events-auto font-dot bg-red-600 hover:bg-red-500 text-white px-4 py-2 border-b-4 border-r-4 border-red-900 active:border-0 active:translate-y-1 active:translate-x-1 transition-all"
          >
            RESET_GAME
          </button>
          
          <div className="font-dot bg-black/50 text-white px-3 py-1 text-xs border-2 border-white/30">
            FPS: 60
          </div>
        </div>
      </div>

      {/* 하단 중앙: 간단한 조작 팁 (선택 사항) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 font-dot text-white/50 text-sm animate-bounce">
        TAP THE LOGO TO GET POINTS
      </div>
    </div>
  );
}