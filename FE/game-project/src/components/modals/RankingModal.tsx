"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import client from "@/lib/axios";

interface RankingModalProps {
  onClose: () => void;
}

type TabType = "GOLD" | "STATS" | "CARD";

export default function RankingModal({ onClose }: RankingModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("GOLD");
  const [rankings, setRankings] = useState<any[]>([]);
  const [myRanking, setMyRanking] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = usePrivy();

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();

        let endpoint = "";
        if (activeTab === "GOLD") endpoint = "/api/v1/rankings/gold";
        else if (activeTab === "STATS") endpoint = "/api/v1/rankings/cards/stat-total";
        else if (activeTab === "CARD") endpoint = "/api/v1/rankings/cards/grade-count";

        const response = await client.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          setRankings(response.data.data.topRankings ?? []);
          setMyRanking(response.data.data.myRanking ?? null);
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
  }, [activeTab]);

  const renderRankingItem = (item: any, isMe = false) => {
    const rankLabel = item.rank <= 3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : `${item.rank}위`;

    let content = null;
    if (activeTab === "GOLD") {
      content = (
        <div className="flex justify-between items-center w-full">
          <span className="text-slate-900 text-base">{item.nickname}</span>
          <span className="text-[#ff9900] font-bold drop-shadow-sm text-base">{item.gold?.toLocaleString() || 0} G</span>
        </div>
      );
    } else if (activeTab === "STATS") {
      content = (
        <div className="flex justify-between items-center w-full">
          <span className="text-slate-900 text-base">{item.nickname}</span>
          <span className="text-blue-600 font-bold drop-shadow-sm text-base">합계: {item.statTotal?.toLocaleString() || 0}</span>
        </div>
      );
    } else if (activeTab === "CARD") {
      content = (
        <div className="flex justify-between items-center w-full">
          <span className="text-slate-900 text-base">{item.nickname}</span>
          <div className="flex gap-4 items-center">
            <span className="text-orange-500 font-bold text-sm">S: {item.sCount || 0}</span>
            <span className="text-blue-400 font-bold text-sm">A: {item.aCount || 0}</span>
          </div>
        </div>
      );
    }

    return (
      <div key={`${activeTab}-${item.rank}-${item.nickname}`} className={`flex items-center mb-3 p-3 border-2 border-[#6b859e] ${isMe ? 'bg-yellow-100/90' : 'bg-white/70'}`}>
        <span className={`w-10 text-center text-base mr-5 flex-shrink-0 ${item.rank <= 3 ? 'text-yellow-600 drop-shadow-sm text-xl' : 'text-slate-800'}`}>
          {rankLabel}
        </span>
        {content}
        {isMe && <span className="ml-2 text-xs text-yellow-700 flex-shrink-0">나</span>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto">
      <div className="bg-[#b0c4de] p-7 border-4 border-[#6b859e] w-[500px] max-w-[90%] h-[550px] max-h-[85%] flex flex-col shadow-[8px_8px_0px_#4a5d73] relative">

        <button onClick={onClose} className="absolute top-2 right-4 text-white hover:text-red-600 text-3xl drop-shadow-md">
          &times;
        </button>

        <h2 className="text-slate-900 font-bold text-3xl mb-7 text-center">랭킹</h2>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActiveTab("GOLD")}
            className={`flex-1 py-3 text-base border-2 border-slate-600 transition-colors ${activeTab === 'GOLD' ? 'bg-[#ffcc00] text-black shadow-inner shadow-black/20' : 'bg-[#6b859e] text-white hover:bg-[#8ea4b8]'}`}
          >
            누적 골드
          </button>
          <button
            onClick={() => setActiveTab("STATS")}
            className={`flex-1 py-3 text-base border-2 border-slate-600 transition-colors ${activeTab === 'STATS' ? 'bg-[#4a90e2] text-white shadow-inner shadow-black/20' : 'bg-[#6b859e] text-white hover:bg-[#8ea4b8]'}`}
          >
            능력치 총합
          </button>
          <button
            onClick={() => setActiveTab("CARD")}
            className={`flex-1 py-3 text-base border-2 border-slate-600 transition-colors ${activeTab === 'CARD' ? 'bg-[#5daf53] text-white shadow-inner shadow-black/20' : 'bg-[#6b859e] text-white hover:bg-[#8ea4b8]'}`}
          >
            소지 카드별
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#8ea4b8] border-2 border-[#6b859e] p-4 pr-6 custom-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center flex-col gap-4">
              <div className="w-12 h-12 border-4 border-white border-t-yellow-400 rounded-full animate-spin" />
              <p className="text-white text-base animate-pulse">불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-red-600 text-base bg-red-100/50 border-2 border-red-400 p-4">
              {error}
            </div>
          ) : rankings.length > 0 ? (
            <>
              {rankings.map((item) => renderRankingItem(item))}
              {myRanking && (
                <>
                  <div className="border-t-2 border-dashed border-white/60 my-3" />
                  <p className="text-white/80 text-xs mb-2">내 순위</p>
                  {renderRankingItem(myRanking, true)}
                </>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-700 text-base">
              랭킹 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}