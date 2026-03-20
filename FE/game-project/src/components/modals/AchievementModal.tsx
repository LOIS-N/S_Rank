"use client";

import { useState } from "react";

interface AchievementModalProps {
  onClose: () => void;
}

const MOCK_ACHIEVEMENTS = [
  { id: 1, title: '첫 걸음', condition: '튜토리얼 완료하기', status: '0/1', reward: '1000', isCompleted: false, isClaimed: false },
  { id: 2, title: '면접관의 자질', condition: '개발자 면접 10회 진행', status: '7/10', reward: '5000', isCompleted: false, isClaimed: false },
  { id: 3, title: '자본주의의 노예', condition: '누적 골드 100,000G 달성', status: '100000/100000', reward: '10000', isCompleted: true, isClaimed: false },
  { id: 4, title: '스타트업 대표', condition: '회사 레벨 5 달성', status: '5/5', reward: '20000', isCompleted: true, isClaimed: true },
];

export default function AchievementModal({ onClose }: AchievementModalProps) {
  const [achievements, setAchievements] = useState(() => {
    return [...MOCK_ACHIEVEMENTS].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      if (a.isClaimed !== b.isClaimed) return a.isClaimed ? 1 : -1;
      return 0;
    });
  });

  const [rewardMsg, setRewardMsg] = useState("");

  const handleClaim = (id: number, reward: string) => {
    setAchievements(prev => {
      const updated = prev.map(ach => ach.id === id ? { ...ach, isClaimed: true } : ach);
      return updated.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        if (a.isClaimed !== b.isClaimed) return a.isClaimed ? 1 : -1;
        return 0;
      });
    });
    setRewardMsg(`${reward}G를 얻었습니다.`);
  };

  const handleClaimAll = () => {
    let totalClaimed = 0;
    setAchievements(prev => {
      const updated = prev.map(ach => {
        if (ach.isCompleted && !ach.isClaimed) {
          totalClaimed += parseInt(ach.reward);
          return { ...ach, isClaimed: true };
        }
        return ach;
      });
      return updated.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        if (a.isClaimed !== b.isClaimed) return a.isClaimed ? 1 : -1;
        return 0;
      });
    });

    if (totalClaimed > 0) {
      setRewardMsg(`총 ${totalClaimed.toLocaleString()}G 보상을 수령하였습니다.`);
    } else {
      setRewardMsg("수령할 보상이 없습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto">
      <div className="bg-[#b0c4de] p-7 border-4 border-[#6b859e] w-[546px] h-[60vh] flex flex-col shadow-[8px_8px_0px_#4a5d73] relative">

        <button onClick={onClose} className="absolute top-2 right-4 text-white hover:text-red-600 text-xl drop-shadow-md">
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
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`flex items-center justify-between p-5 border-2 shadow-[4px_4px_0px_rgba(74,93,115,0.5)]
                ${ach.isClaimed
                  ? 'bg-[#8ea4b8] border-[#6b859e] text-slate-700'
                  : (ach.isCompleted ? 'bg-green-100 border-green-600 text-slate-900 cursor-pointer active:translate-y-1 active:shadow-none' : 'bg-[#e2e8f0] border-slate-400 text-slate-800')
                }`}
              onClick={() => {
                if (ach.isCompleted && !ach.isClaimed) handleClaim(ach.id, ach.reward);
              }}
            >
              <div className="flex items-center gap-5">
                <div className="text-3xl">🏆</div>
                <div>
                  <div className="text-xl mb-0.5">{ach.title}</div>
                  <div className={`text-sm ${ach.isClaimed ? 'text-slate-500' : 'text-slate-600'}`}>{ach.condition}</div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-3">
                <div className="bg-[#6b859e] text-white px-3 py-0.5 text-sm rounded shadow-sm">{ach.status}</div>
                <div className={`text-sm ${ach.isClaimed ? 'hidden' : 'text-blue-700 font-bold'}`}>보상: {ach.reward}G</div>
                {ach.isClaimed && <div className="text-slate-600 text-sm">수령 완료</div>}
                {!ach.isClaimed && ach.isCompleted && <div className="text-green-600 text-sm animate-pulse drop-shadow-sm">클릭하여 수령!</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

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