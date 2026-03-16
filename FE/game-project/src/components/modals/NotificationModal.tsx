"use client";

import { useState } from "react";

interface NotificationModalProps {
  onClose: () => void;
}

// Mock Data
const MOCK_NOTIFICATIONS = [
  { id: 1, title: '새로운 퀘스트가 도착했습니다!', content: '개발자 채용 공고를 올려보세요.', date: '2023-10-25', isRead: false },
  { id: 2, title: 'S급 개발자 영입 성공', content: '김코딩 님이 합류했습니다!', date: '2023-10-24', isRead: false },
  { id: 3, title: '서버 점검 보상 지급 안내', content: '우편함을 확인해주세요.', date: '2023-10-23', isRead: true },
  { id: 4, title: '주간 골드 랭킹 보상', content: '10,000G가 지급되었습니다.', date: '2023-10-22', isRead: true },
  { id: 5, title: '게임 오픈 안내', content: 'S급 개발자들이 나를 따르는 이유에 오신 것을 환영합니다!', date: '2023-10-20', isRead: true },
];

export default function NotificationModal({ onClose }: NotificationModalProps) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const handleRead = (id: number) => {
    setNotifications(prev => 
      prev.map(noti => noti.id === id ? { ...noti, isRead: true } : noti)
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto">
      <div className="bg-[#b0c4de] p-10 border-4 border-[#6b859e] w-[650px] h-[65vh] flex flex-col shadow-[8px_8px_0px_#4a5d73] relative">
        
        {/* 우측 상단 X 버튼 */}
        <button onClick={onClose} className="absolute top-2 right-4 text-white hover:text-red-600 text-3xl drop-shadow-md">
          &times;
        </button>

        <h2 className="text-slate-900 font-bold text-5xl mb-10 text-center">알림</h2>

        {/* 스크롤 가능한 메세지 목록 */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {notifications.map((noti) => (
            <div 
              key={noti.id} 
              onClick={() => handleRead(noti.id)}
              className={`mb-5 p-6 border-2 cursor-pointer transition-colors active:translate-y-0.5
                ${noti.isRead 
                  ? 'bg-[#8ea4b8] border-[#6b859e] text-slate-700' 
                  : 'bg-white border-[#4a90e2] text-slate-900 shadow-[4px_4px_0px_rgba(74,144,226,0.5)]'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl">{noti.title}</span>
                {!noti.isRead && <span className="bg-red-500 text-white text-sm px-2 py-1 rounded">NEW</span>}
              </div>
              <p className={`text-xl ${noti.isRead ? 'text-slate-600' : 'text-slate-700'}`}>
                {noti.content}
              </p>
              <p className={`text-base mt-4 text-right ${noti.isRead ? 'text-slate-500' : 'text-slate-400'}`}>
                {noti.date}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
