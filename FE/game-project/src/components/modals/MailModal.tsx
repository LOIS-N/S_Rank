"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUserStore } from "@/store/useUserStore";
import { useGameStore } from "@/store/useGameStore";
import api from "@/lib/axios";

interface MailModalProps {
  onClose: () => void;
}

type MailType = "SYSTEM" | "REWARD" | "BUY_COMPLETE" | "SALE_COMPLETE" | "NFT_COMPLETE" | "SALE_EXPIRED";

interface MailItem {
  mailId: number;
  mailType: MailType;
  isRead: boolean;
  isClaimed: boolean;
  message: string;
  reward: number | null;
  createdAt: string;
}

const MAIL_TYPE_LABEL: Record<MailType, string> = {
  SYSTEM:       "공지",
  REWARD:       "보상",
  BUY_COMPLETE: "구매완료",
  SALE_COMPLETE:"판매완료",
  NFT_COMPLETE: "NFT완료",
  SALE_EXPIRED: "기간만료",
};

const MAIL_TYPE_COLOR: Record<MailType, string> = {
  SYSTEM:       "bg-[#6b859e] text-white",
  REWARD:       "bg-yellow-600 text-white",
  BUY_COMPLETE: "bg-green-700 text-white",
  SALE_COMPLETE:"bg-blue-700 text-white",
  NFT_COMPLETE: "bg-purple-700 text-white",
  SALE_EXPIRED: "bg-red-700 text-white",
};

function formatDate(dateStr: string): string {
  // BE LocalDateTime은 타임존 없이 옴 ("2026-03-28T10:00:00" 또는 "2026-03-28 10:00:00")
  // syncActiveQuests와 동일하게 UTC로 정규화 후 로컬 시간으로 표시
  const normalized = dateStr.includes("Z") || dateStr.includes("+")
    ? dateStr
    : dateStr.replace(" ", "T") + "Z";
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function MailModal({ onClose }: MailModalProps) {
  const { getAccessToken } = usePrivy();
  const { accessToken } = useUserStore();

  const [mails, setMails] = useState<MailItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  const getToken = useCallback(
    async () => accessToken || await getAccessToken(),
    [accessToken, getAccessToken],
  );

  const fetchMails = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const { data } = await api.get("/api/v1/mailboxes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setMails(data.data ?? []);
      }
    } catch {
      setMails([]);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchMails(); }, [fetchMails]);

  const handleClaim = async (mail: MailItem) => {
    if (mail.isClaimed) return;
    if (mail.reward == null) return; // 보상 없는 공지는 클릭 불가

    try {
      const token = await getToken();
      await api.put(`/api/v1/mailboxes/${mail.mailId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 낙관적 UI 업데이트
      setMails(prev => prev.map(m =>
        m.mailId === mail.mailId ? { ...m, isRead: true, isClaimed: true } : m
      ));

      // coin은 BE DB 값 → /me 재호출로 userStore.coin 동기화
      // (refetchCff()는 블록체인 커피 — coin과 무관하므로 사용 금지)
      const meRes = await api.get("/api/v1/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = meRes.data?.data;
      if (me) {
        useUserStore.getState().setProfile({
          nickname: me.nickname,
          level: me.level,
          gold: me.gold,
          coin: me.coin,
        });
        // BE coin = useGameStore.coffee (HUD 커피 아이콘에 표시되는 인게임 재화)
        useGameStore.getState().setResources(me.gold, me.coin);
      }

      setResultMsg(`${(mail.reward ?? 0).toLocaleString()} 커피를 획득했습니다!`);
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      if (code === "M002") {
        setResultMsg("이미 보상을 수령한 우편입니다.");
        setMails(prev => prev.map(m =>
          m.mailId === mail.mailId ? { ...m, isClaimed: true } : m
        ));
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

        <h2 className="text-slate-900 font-bold text-3xl mb-7 text-center">우편함</h2>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {isLoading ? (
            <div className="text-center text-slate-700 py-10">로딩 중...</div>
          ) : mails.length === 0 ? (
            <div className="text-center text-slate-600 py-10">우편이 없습니다.</div>
          ) : (
            mails.map((mail) => {
              const canClaim = !mail.isClaimed && mail.reward != null;
              return (
                <div
                  key={mail.mailId}
                  className={`flex items-center justify-between p-4 border-2 shadow-[4px_4px_0px_rgba(74,93,115,0.5)]
                    ${mail.isClaimed
                      ? "bg-[#8ea4b8] border-[#6b859e] text-slate-600"
                      : canClaim
                        ? "bg-green-100 border-green-600 text-slate-900 cursor-pointer active:translate-y-1 active:shadow-none"
                        : "bg-[#e2e8f0] border-slate-400 text-slate-800"
                    }`}
                  onClick={() => canClaim && handleClaim(mail)}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded shrink-0 mt-0.5 ${MAIL_TYPE_COLOR[mail.mailType]}`}>
                      {MAIL_TYPE_LABEL[mail.mailType]}
                    </span>
                    <div className="min-w-0">
                      <div className="text-base leading-snug break-words">{mail.message}</div>
                      <div className="text-xs text-slate-500 mt-1">{formatDate(mail.createdAt)}</div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2 ml-3 shrink-0">
                    {mail.reward != null && !mail.isClaimed && (
                      <div className="text-sm text-blue-700 font-bold">보상: {mail.reward.toLocaleString()} 커피</div>
                    )}
                    {mail.isClaimed && <div className="text-slate-500 text-sm">수령 완료</div>}
                    {canClaim && (
                      <div className="text-green-600 text-sm animate-pulse drop-shadow-sm">클릭하여 수령!</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 수령 결과 모달 */}
      {resultMsg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#8ea4b8]/80 font-dot">
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-8 text-center max-w-sm shadow-[8px_8px_0px_#4a5d73]">
            <p className="text-2xl mb-8 leading-relaxed text-slate-900 font-bold">{resultMsg}</p>
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
