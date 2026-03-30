"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";
import client from "@/lib/axios";

interface NicknameModalProps {
  onComplete: () => void;
}

export default function NicknameModal({ onComplete }: NicknameModalProps) {
  const { setNickname: setGameNickname } = useGameStore();
  const { accessToken, setNickname: setUserNickname, setProfile, finalizeOnboarding } = useUserStore();

  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateNickname = (name: string) => {
    const regex = /^[a-zA-Z0-9가-힣]{2,8}$/;
    return regex.test(name);
  };

  const handleSubmit = async () => {
    const trimmed = inputValue.trim();
    if (!validateNickname(trimmed)) {
      setIsError(true);
      setMessage("2~8자의 영문, 한글, 숫자만 가능합니다. (띄어쓰기 불가)");
      return;
    }

    setLoading(true);
    setIsError(false);
    setMessage("");

    try {
      const response = await client.put(
        '/api/v1/users/me/nickname',
        { nickname: trimmed },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (response.data.success) {
        // 신규 유저 레벨업: 회원가입 직후 levelup API 호출 (튜토리얼 중간 이탈 시 레벨 0 방지)
        try {
          await client.put('/api/v1/users/levelup', {}, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
        } catch (e) {
          console.error('[Onboarding] levelup API error:', e);
        }

        const profileRes = await client.get('/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (profileRes.data.success) {
          setProfile(profileRes.data.data);
        }

        setGameNickname(trimmed);
        setUserNickname(trimmed);
        finalizeOnboarding();
        // 신규 유저 → 메인 화면 진입 후 튜토리얼 자동 시작 (sessionStorage로 보장)
        sessionStorage.setItem('tutorialPending', '1');
        onComplete();
      } else {
        setIsError(true);
        setMessage(response.data.error?.message || "닉네임 설정에 실패했습니다.");
      }
    } catch (err: any) {
      setIsError(true);
      setMessage(err.response?.data?.error?.message || "서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto">
      <div className="bg-[#b0c4de] p-12 border-4 border-[#6b859e] w-[560px] max-w-[90%] text-center shadow-[8px_8px_0px_#4a5d73]">

        <h2 className="text-slate-900 font-bold text-5xl mb-4">닉네임 설정</h2>
        <p className="text-slate-700 text-xl mb-10">사용할 닉네임을 입력해주세요.</p>

        <div className="flex gap-4 mb-4">
          <input
            className={`flex-1 p-5 text-2xl bg-white text-black border-2 ${isError ? 'border-red-500' : 'border-slate-400'} outline-none focus:border-blue-500`}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setMessage("");
              setIsError(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            maxLength={8}
            placeholder="2~8자"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-10 text-2xl font-bold border-b-4 border-r-4 active:border-0 active:translate-y-1 transition-all ${
              loading ? 'bg-slate-400 border-slate-500 text-white' : 'bg-[#ffcc00] text-black border-[#cc9900]'
            }`}
          >
            {loading ? '...' : '확인'}
          </button>
        </div>

        {message && (
          <p className={`text-xl ${isError ? 'text-red-500' : 'text-green-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
