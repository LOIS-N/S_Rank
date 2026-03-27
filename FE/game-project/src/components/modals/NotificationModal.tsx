"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { requestNotificationPermission } from "@/hooks/useSSENotification";

interface NotificationModalProps {
  onClose: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hour}:${min}`;
}

export default function NotificationModal({ onClose }: NotificationModalProps) {
  const { notifications, markNotificationRead } = useGameStore();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto pb-[calc(6cqw+10px)]" onClick={onClose} onPointerDown={e => e.stopPropagation()}>
      <div className="bg-[#b0c4de] p-7 border-4 border-[#6b859e] w-[455px] max-w-[90%] h-[480px] max-h-[85%] flex flex-col shadow-[8px_8px_0px_#4a5d73] relative" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>

        <button onClick={onClose} className="absolute top-2 right-4 text-white hover:text-red-600 text-3xl drop-shadow-md">
          &times;
        </button>

        <h2 className="text-slate-900 font-bold text-3xl mb-4 text-center">알림</h2>

        {notifPermission !== "granted" && (
          <button
            onClick={handleRequestPermission}
            className="mb-4 py-1.5 px-3 text-sm bg-[#4a90e2] text-white border-2 border-[#2a6cb8] shadow-[3px_3px_0px_#1a4c8e] active:translate-y-0.5 active:shadow-none"
          >
            {notifPermission === "denied" ? "알림이 차단됨 (브라우저 설정에서 허용)" : "퀘스트 완료 알림 허용"}
          </button>
        )}

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {notifications.length === 0 ? (
            <p className="text-center text-slate-600 mt-8 text-base">알림이 없습니다.</p>
          ) : (
            notifications.map((noti) => (
              <div
                key={noti.id}
                onClick={() => markNotificationRead(noti.id)}
                className={`mb-3 p-4 border-2 cursor-pointer transition-colors active:translate-y-0.5
                  ${noti.isRead
                    ? 'bg-[#8ea4b8] border-[#6b859e] text-slate-700'
                    : 'bg-white border-[#4a90e2] text-slate-900 shadow-[4px_4px_0px_rgba(74,144,226,0.5)]'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-base">{noti.title}</span>
                  {!noti.isRead && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">NEW</span>}
                </div>
                <p className={`text-sm ${noti.isRead ? 'text-slate-600' : 'text-slate-700'}`}>
                  {noti.body}
                </p>
                <p className={`text-xs mt-2 text-right ${noti.isRead ? 'text-slate-500' : 'text-slate-400'}`}>
                  {formatDate(noti.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
