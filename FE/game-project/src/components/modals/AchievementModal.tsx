"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUserStore } from "@/store/useUserStore";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import api from "@/lib/axios"; // BE 연동

interface AchievementModalProps {
  onClose: () => void;
}

interface Achievement {
  id: number;
  title: string;
  condition: string;
  status: string;
  rewardCff: number;   // CFF 보상량
  isCompleted: boolean;
  isClaimed: boolean;
}

function sortAchievements(list: Achievement[]) {
  return [...list].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1;
    if (a.isClaimed   !== b.isClaimed)   return a.isClaimed   ?  1 : -1;
    return 0;
  });
}

export default function AchievementModal({ onClose }: AchievementModalProps) {
  const { getAccessToken } = usePrivy();
  const { accessToken } = useUserStore();
  const { refetch: refetchCff } = useTokenBalance();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rewardMsg, setRewardMsg] = useState("");

  const getToken = useCallback(
    async () => accessToken || await getAccessToken(),
    [accessToken, getAccessToken],
  );

  // ── 업적 목록 조회 ──
  const fetchAchievements = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const { data } = await api.get("/api/v1/achievements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setAchievements(sortAchievements(data.data ?? []));
        return;
      }
      setAchievements([]);
    } catch {
      setAchievements([]);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

  // ── 단건 수령 ──
  const handleClaim = async (id: number) => {
    const target = achievements.find(a => a.id === id);
    if (!target || !target.isCompleted || target.isClaimed) return;

    try {
      const token = await getToken();
      await api.post(`/api/v1/achievements/${id}/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 상태 낙관적 업데이트
      setAchievements(prev => sortAchievements(
        prev.map(a => a.id === id ? { ...a, isClaimed: true } : a)
      ));
      setRewardMsg(`${target.rewardCff} CFF를 획득했습니다!`);

      // HUD CFF 잔액 갱신
      refetchCff();
    } catch (e: unknown) {
      const code = (e as any)?.response?.data?.error?.code;
      if (code === "A002" || code === "ACHIEVEMENT_ALREADY_CLAIMED") {
        setRewardMsg("이미 수령한 보상입니다.");
        setAchievements(prev => sortAchievements(
          prev.map(a => a.id === id ? { ...a, isClaimed: true } : a)
        ));
      } else {
        setRewardMsg("수령 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    }
  };

  // ── 일괄 수령 ──
  const handleClaimAll = async () => {
    const claimable = achievements.filter(a => a.isCompleted && !a.isClaimed);
    if (claimable.length === 0) { setRewardMsg("수령할 보상이 없습니다."); return; }

    try {
      const token = await getToken();
      await api.post("/api/v1/achievements/claim-all", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const totalCff = claimable.reduce((sum, a) => sum + a.rewardCff, 0);
      setAchievements(prev => sortAchievements(
        prev.map(a => (a.isCompleted && !a.isClaimed) ? { ...a, isClaimed: true } : a)
      ));
      setRewardMsg(`총 ${totalCff} CFF를 획득했습니다!`);

      // HUD CFF 잔액 갱신
      refetchCff();
    } catch {
      setRewardMsg("수령 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto pb-[calc(6cqw+10px)]" onClick={onClose} onPointerDown={e => e.stopPropagation()}>
      <div className="bg-[#b0c4de] p-7 border-4 border-[#6b859e] w-[546px] max-w-[90%] h-[580px] max-h-[85%] flex flex-col shadow-[8px_8px_0px_#4a5d73] relative" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>

        <button onClick={onClose} className="absolute top-2 right-4 text-white hover:text-red-600 text-3xl drop-shadow-md">
          &times;
        </button>

        <h2 className="text-slate-900 font-bold text-3xl mb-7 text-center">업적</h2>

        <div className="flex justify-end mb-3">
          <button
            onClick={handleClaimAll}
            className="px-7 py-3 text-base bg-yellow-500 text-black border-b-4 border-r-4 border-yellow-800 active:border-0 active:translate-y-1 transition-all"
          >
            일괄 수령
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {isLoading ? (
            <div className="text-center text-slate-700 py-10">로딩 중...</div>
          ) : achievements.length === 0 ? (
            <div className="text-center text-slate-600 py-10">업적이 없습니다.</div>
          ) : (
            achievements.map((ach) => (
              <div
                key={ach.id}
                className={`flex items-center justify-between p-5 border-2 shadow-[4px_4px_0px_rgba(74,93,115,0.5)]
                  ${ach.isClaimed
                    ? "bg-[#8ea4b8] border-[#6b859e] text-slate-700"
                    : ach.isCompleted
                      ? "bg-green-100 border-green-600 text-slate-900 cursor-pointer active:translate-y-1 active:shadow-none"
                      : "bg-[#e2e8f0] border-slate-400 text-slate-800"
                  }`}
                onClick={() => { if (ach.isCompleted && !ach.isClaimed) handleClaim(ach.id); }}
              >
                <div className="flex items-center gap-5">
                  <div className="text-3xl">🏆</div>
                  <div>
                    <div className="text-xl mb-0.5">{ach.title}</div>
                    <div className={`text-sm ${ach.isClaimed ? "text-slate-500" : "text-slate-600"}`}>
                      {ach.condition}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-3">
                  <div className="bg-[#6b859e] text-white px-3 py-0.5 text-sm rounded shadow-sm">{ach.status}</div>
                  {!ach.isClaimed && (
                    <div className="text-sm text-blue-700 font-bold">보상: {ach.rewardCff} CFF</div>
                  )}
                  {ach.isClaimed && <div className="text-slate-600 text-sm">수령 완료</div>}
                  {!ach.isClaimed && ach.isCompleted && (
                    <div className="text-green-600 text-sm animate-pulse drop-shadow-sm">클릭하여 수령!</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 수령 결과 모달 */}
      {rewardMsg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#8ea4b8]/80 font-dot">
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-8 text-center max-w-sm shadow-[8px_8px_0px_#4a5d73]">
            <p className="text-2xl mb-8 leading-relaxed text-slate-900 font-bold">{rewardMsg}</p>
            <button
              onClick={() => setRewardMsg("")}
              className="w-full py-4 bg-[#ffcc00] text-black border-b-4 border-r-4 border-[#cc9900] active:border-0 active:translate-y-1 transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}