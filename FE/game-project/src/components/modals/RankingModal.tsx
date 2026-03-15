"use client";

import { useState } from "react";

interface RankingModalProps {
  onClose: () => void;
}

// Mock Data
const MOCK_RANKINGS = Array.from({ length: 50 }, (_, i) => ({
  rank: i + 1,
  nickname: `플레이어_${i + 1}`,
  score: Math.floor(100000 / (i + 1))
}));

export default function RankingModal({ onClose }: RankingModalProps) {
  const [activeTab, setActiveTab] = useState<"GOLD" | "STATS" | "CARD">("GOLD");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto">
      <div className="bg-[#b0c4de] p-8 border-4 border-[#6b859e] w-[500px] h-[55vh] flex flex-col shadow-[8px_8px_0px_#4a5d73] relative">
        
        {/* 닫기 버튼 */}
        <button onClick={onClose} className="absolute top-2 right-4 text-white hover:text-red-600 text-3xl drop-shadow-md">
          &times;
        </button>

        <h2 className="text-slate-900 font-bold text-3xl mb-6 text-center">랭킹</h2>

        {/* 3개의 탭 */}
        <div className="flex gap-1 mb-4">
          <button 
            onClick={() => setActiveTab("GOLD")}
            className={`flex-1 py-2 border-2 border-slate-600 ${activeTab === 'GOLD' ? 'bg-[#ffcc00] text-black' : 'bg-[#6b859e] text-white hover:bg-[#8ea4b8]'}`}
          >
            누적 골드
          </button>
          <button 
            onClick={() => setActiveTab("STATS")}
            className={`flex-1 py-2 border-2 border-slate-600 ${activeTab === 'STATS' ? 'bg-[#4a90e2] text-white' : 'bg-[#6b859e] text-white hover:bg-[#8ea4b8]'}`}
          >
            능력치 총합
          </button>
          <button 
            onClick={() => setActiveTab("CARD")}
            className={`flex-1 py-2 border-2 border-slate-600 ${activeTab === 'CARD' ? 'bg-[#5daf53] text-white' : 'bg-[#6b859e] text-white hover:bg-[#8ea4b8]'}`}
          >
            소지 카드별
          </button>
        </div>

        {/* 랭킹 리스트 (스크롤) */}
        <div className="flex-1 overflow-y-auto bg-[#8ea4b8] border-2 border-[#6b859e] p-2 pr-4 custom-scrollbar">
          {MOCK_RANKINGS.map((item) => (
            <div key={item.rank} className="flex justify-between items-center bg-white/70 mb-2 p-3 border-2 border-[#6b859e]">
              <div className="flex gap-4 items-center">
                <span className={`w-8 text-center ${item.rank <= 3 ? 'text-yellow-600 drop-shadow-sm text-xl' : 'text-slate-800'}`}>
                  {item.rank <= 3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : `${item.rank}위`}
                </span>
                <span className="text-slate-900">{item.nickname}</span>
              </div>
              <span className="text-[#ff9900] font-bold drop-shadow-sm">{item.score.toLocaleString()} 점</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
