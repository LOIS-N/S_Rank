"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUserStore } from "@/store/useUserStore";
import api from "@/lib/axios";

interface DailyMissionModalProps {
  onClose: () => void;
}

type MissionCategory = "QUEST" | "DRAW" | "SYNTHESIS" | "ENHANCEMENT";

interface MissionItem {
  missionId: number;
  name: string;
  category: MissionCategory;
  requiredCount: number;
  rewardToken: number;
  currentCount: number;
  completed: boolean;
  rewardClaimed: boolean;
}

interface DailyMissionStatus {
  missionDate: string;
  missions: MissionItem[];
}

const CATEGORY_ICON: Record<MissionCategory, string> = {
  QUEST:       "📋",
  DRAW:        "🎴",
  SYNTHESIS:   "⚗️",
  ENHANCEMENT: "⬆️",
};

const CATEGORY_LABEL: Record<MissionCategory, string> = {
  QUEST:       "퀘스트",
  DRAW:        "뽑기",
  SYNTHESIS:   "합성",
  ENHANCEMENT: "강화",
};

export default function DailyMissionModal({ onClose }: DailyMissionModalProps) {
  const { getAccessToken } = usePrivy();
  const { accessToken } = useUserStore();

  const [status, setStatus] = useState<DailyMissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  const getToken = useCallback(
    async () => accessToken || await getAccessToken(),
    [accessToken, getAccessToken],
  );

  const fetchMissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const { data } = await api.get("/api/v1/missions/daily", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setStatus(data.data);
      }
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  const handleClaim = async (mission: MissionItem) => {
    if (!mission.completed || mission.rewardClaimed) return;
    try {
      const token = await getToken();
      const { data } = await api.post(
        `/api/v1/missions/daily/${mission.missionId}/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // 낙관적 UI 업데이트
      setStatus(prev => prev ? {
        ...prev,
        missions: prev.missions.map(m =>
          m.missionId === mission.missionId ? { ...m, rewardClaimed: true } : m
        ),
      } : prev);

      const rewardToken = data?.data?.rewardToken ?? mission.rewardToken;
      // 블록체인 미구현 안내 포함
      setResultMsg(
        `미션 완료 기록이 저장되었습니다.\n보상 ${rewardToken} CFF는 블록체인 연동 완료 후 지급됩니다.`
      );
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      if (code === "DM002") {
        setResultMsg("아직 달성되지 않은 미션입니다.");
      } else if (code === "DM003") {
        setResultMsg("이미 보상을 수령한 미션입니다.");
        setStatus(prev => prev ? {
          ...prev,
          missions: prev.missions.map(m =>
            m.missionId === mission.missionId ? { ...m, rewardClaimed: true } : m
          ),
        } : prev);
      } else {
        setResultMsg("수령 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto pb-[calc(6cqw+10px)]"
      onClick={onClose}
      onPointerDown={e => e.stopPropagation()}
    >
      <div
        className="bg-[#b0c4de] p-7 border-4 border-[#6b859e] w-[580px] max-w-[90%] h-[580px] max-h-[85%] flex flex-col shadow-[8px_8px_0px_#4a5d73] relative"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-white hover:text-red-600 text-3xl drop-shadow-md"
        >
          &times;
        </button>

        <h2 className="text-slate-900 font-bold text-3xl mb-2 text-center">데일리 미션</h2>
        {status?.missionDate && (
          <p className="text-center text-slate-600 text-sm mb-5">{status.missionDate} 기준</p>
        )}

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {isLoading ? (
            <div className="text-center text-slate-700 py-10">로딩 중...</div>
          ) : !status ? (
            <div className="text-center text-slate-600 py-10">미션 정보를 불러올 수 없습니다.</div>
          ) : (
            status.missions.map((mission) => {
              const canClaim = mission.completed && !mission.rewardClaimed;
              const progressPct = Math.min(100, Math.floor((mission.currentCount / mission.requiredCount) * 100));
              return (
                <div
                  key={mission.missionId}
                  className={`p-4 border-2 shadow-[4px_4px_0px_rgba(74,93,115,0.5)]
                    ${mission.rewardClaimed
                      ? "bg-[#8ea4b8] border-[#6b859e] text-slate-600"
                      : canClaim
                        ? "bg-green-100 border-green-600 text-slate-900 cursor-pointer active:translate-y-1 active:shadow-none"
                        : "bg-[#e2e8f0] border-slate-400 text-slate-800"
                    }`}
                  onClick={() => canClaim && handleClaim(mission)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{CATEGORY_ICON[mission.category]}</span>
                      <span className="text-base font-bold">{mission.name}</span>
                      <span className="text-xs bg-[#6b859e] text-white px-2 py-0.5 rounded">
                        {CATEGORY_LABEL[mission.category]}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {mission.rewardClaimed ? (
                        <span className="text-slate-500 text-sm">수령 완료</span>
                      ) : (
                        <span className="text-sm text-blue-700 font-bold">보상: {mission.rewardToken} CFF</span>
                      )}
                    </div>
                  </div>

                  {/* 진행률 바 */}
                  <div className="w-full bg-slate-300 rounded-full h-3 mb-1">
                    <div
                      className={`h-3 rounded-full transition-all ${mission.completed ? "bg-green-500" : "bg-blue-400"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{mission.currentCount} / {mission.requiredCount}</span>
                    {canClaim && (
                      <span className="text-green-600 font-bold animate-pulse">클릭하여 수령!</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 결과 모달 */}
      {resultMsg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#8ea4b8]/80 font-dot">
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-8 text-center max-w-sm shadow-[8px_8px_0px_#4a5d73]">
            <p className="text-xl mb-8 leading-relaxed text-slate-900 font-bold whitespace-pre-line">{resultMsg}</p>
            <button
              onClick={() => setResultMsg("")}
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
