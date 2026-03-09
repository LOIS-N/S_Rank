"use client";

import { useGameStore } from "@/store/useGameStore";

export default function UIOverlay() {
  // Zustand 스토어에서 상태를 가져옵니다.
  const { score, resetScore } = useGameStore();

  return (
    <div className="absolute top-4 left-4 pointer-events-none w-full pr-8">
      <div className="flex justify-between items-start">
        {/* 점수판 디자인 (Tailwind 사용) */}
        <div className="bg-black/50 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-2xl">
          <p className="text-slate-300 text-xs uppercase tracking-widest font-bold">Score</p>
          <p className="text-white text-4xl font-black tabular-nums">{score}</p>
        </div>

        {/* 리셋 버튼 (마우스 클릭 허용) */}
        <button
          onClick={resetScore}
          className="pointer-events-auto bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-all active:scale-95 shadow-lg"
        >
          Reset Game
        </button>
      </div>
    </div>
  );
}