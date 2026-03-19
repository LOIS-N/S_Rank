"use client";

import { useState, useEffect } from "react";
import client from "@/lib/axios";
import { useUserStore } from "@/store/useUserStore";

interface RankingModalProps {
  onClose: () => void;
}

type TabType = "GOLD" | "STATS" | "CARD";

export default function RankingModal({ onClose }: RankingModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("GOLD");
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useUserStore();

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      setError(null);
      try {
        let endpoint = "";
        if (activeTab === "GOLD") endpoint = "/api/v1/rankings/gold";
        else if (activeTab === "STATS") endpoint = "/api/v1/rankings/cards/stat-total";
        else if (activeTab === "CARD") endpoint = "/api/v1/rankings/cards/grade-count";

        const response = await client.get(endpoint, {
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
        });

        if (response.data.success) {
          setRankings(response.data.data);
        } else {
          setError(response.data.error?.message || "랭킹 정보를 가져오는데 실패했습니다.");
        }
      } catch (err: any) {
        console.error("Fetch rankings failed:", err);
        setError("서버 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [activeTab, accessToken]);

  const renderRankingItem = (item: any) => {
    const rankLabel = item.rank <= 3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : `${item.rank}위`;
    
    let content = null;
    if (activeTab === "GOLD") {
      content = (
        <div className="flex justify-between items-center w-full">
          <span className="text-slate-900 text-2xl">{item.nickname}</span>
          <span className="text-[#ff9900] font-bold drop-shadow-sm text-2xl">{item.gold?.toLocaleString() || 0} G</span>
        </div>
      );
    } else if (activeTab === "STATS") {
      content = (
        <div className="flex justify-between items-center w-full">
          <span className="text-slate-900 text-2xl">{item.cardName}</span>
          <span className="text-blue-600 font-bold drop-shadow-sm text-2xl">합계: {item.statTotal?.toLocaleString() || 0}</span>
        </div>
      );
    } else if (activeTab === "CARD") {
      content = (
        <div className="flex justify-between items-center w-full">
          <span className="text-slate-900 text-2xl">{item.nickname}</span>
          <div className="flex gap-4 items-center">
            <span className="text-orange-500 font-bold text-xl">S: {item.sCount || 0}</span>
            <span className="text-blue-400 font-bold text-xl">A: {item.aCount || 0}</span>
          </div>
        </div>
      );
    }

    return (
      <div key={`${activeTab}-${item.rank}-${item.nickname || item.cardName}`} className="flex items-center bg-white/70 mb-5 p-5 border-2 border-[#6b859e]">
        <span className={`w-14 text-center text-2xl mr-8 flex-shrink-0 ${item.rank <= 3 ? 'text-yellow-600 drop-shadow-sm text-3xl' : 'text-slate-800'}`}>
          {rankLabel}
        </span>
        {content}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto">
      <div className="bg-[#b0c4de] p-10 border-4 border-[#6b859e] w-[650px] h-[72vh] flex flex-col shadow-[8px_8px_0px_#4a5d73] relative">
        
        <button onClick={onClose} className="absolute top-2 right-4 text-white hover:text-red-600 text-3xl drop-shadow-md">
          &times;
        </button>

        <h2 className="text-slate-900 font-bold text-5xl mb-10 text-center">랭킹</h2>

        <div className="flex gap-2 mb-8">
          <button 
            onClick={() => setActiveTab("GOLD")}
            className={`flex-1 py-4 text-2xl border-2 border-slate-600 transition-colors ${activeTab === 'GOLD' ? 'bg-[#ffcc00] text-black shadow-inner shadow-black/20' : 'bg-[#6b859e] text-white hover:bg-[#8ea4b8]'}`}
          >
            누적 골드
          </button>
          <button 
            onClick={() => setActiveTab("STATS")}
            className={`flex-1 py-4 text-2xl border-2 border-slate-600 transition-colors ${activeTab === 'STATS' ? 'bg-[#4a90e2] text-white shadow-inner shadow-black/20' : 'bg-[#6b859e] text-white hover:bg-[#8ea4b8]'}`}
          >
            능력치 총합
          </button>
          <button 
            onClick={() => setActiveTab("CARD")}
            className={`flex-1 py-4 text-2xl border-2 border-slate-600 transition-colors ${activeTab === 'CARD' ? 'bg-[#5daf53] text-white shadow-inner shadow-black/20' : 'bg-[#6b859e] text-white hover:bg-[#8ea4b8]'}`}
          >
            소지 카드별
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#8ea4b8] border-2 border-[#6b859e] p-6 pr-8 custom-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center flex-col gap-4">
              <div className="w-12 h-12 border-4 border-white border-t-yellow-400 rounded-full animate-spin" />
              <p className="text-white text-2xl animate-pulse">불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-red-600 text-2xl bg-red-100/50 border-2 border-red-400 p-4">
              {error}
            </div>
          ) : rankings.length > 0 ? (
            rankings.map(renderRankingItem)
          ) : (
            <div className="h-full flex items-center justify-center text-slate-700 text-2xl">
              랭킹 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

