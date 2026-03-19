"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";
import { usePrivy } from "@privy-io/react-auth";
import client from "@/lib/axios";
import { useRouter } from "next/navigation";

interface MyPageModalProps {
  onClose: () => void;
  isOnboarding?: boolean;
}

export default function MyPageModal({ onClose, isOnboarding = false }: MyPageModalProps) {
  const { nickname, setNickname, logout } = useGameStore();
  const { accessToken, setNickname: setUserStoreNickname, setProfile, finalizeOnboarding, clearUser } = useUserStore();
  const { logout: privyLogout } = usePrivy();
  const router = useRouter();
  
  const [inputValue, setInputValue] = useState(nickname || "");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  
  // 닉네임 유효성 검사
  const validateNickname = (name: string) => {
    const regex = /^[a-zA-Z0-9가-힣]{2,8}$/;
    return regex.test(name);
  };

  const handleUpdateNickname = async () => {
    const trimmed = inputValue.trim();
    // 동일 닉네임 체크
    if (trimmed === nickname) {
      setIsError(false);
      setMessage("기존 닉네임과 동일합니다.");
      return;
    }

    if (!validateNickname(trimmed)) {
      setIsError(true);
      setMessage("2~8자의 영문, 한글, 숫자만 가능합니다. (띄어쓰기 불가)");
      return;
    }

    setLoading(true);
    setIsError(false);
    setMessage("");

    try {
      // 1. 닉네임 수정 API 호출
      const response = await client.put(
        '/api/v1/users/me/nickname',
        { nickname: trimmed },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.success) {
        // 2. 성공 시 최신 프로필 정보 다시 가져오기
        const profileRes = await client.get('/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (profileRes.data.success) {
          setProfile(profileRes.data.data);
        }

        setNickname(trimmed); // GameStore 업데이트
        setUserStoreNickname(trimmed); // UserStore 업데이트
        finalizeOnboarding(); // Onboarding 완료 상태로 변경
        
        // GameStore 리소스 동기화
        useGameStore.getState().setResources(profileRes.data.data.gold, profileRes.data.data.coin);

        setIsError(false);
        setMessage("변경이 완료되었습니다");

        // 3. 온보딩 중이면 메인으로 이동
        if (isOnboarding) {
          router.push('/');
        }
      } else {
        setIsError(true);
        setMessage(response.data.error?.message || "닉네임 수정에 실패했습니다.");
      }
    } catch (err: any) {
      setIsError(true);
      const errorMsg = err.response?.data?.error?.message || "서버 오류가 발생했습니다.";
      setMessage(errorMsg);
      console.error('Update nickname failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await privyLogout();
    logout(); 
    clearUser();
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      const response = await client.delete('/api/v1/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.data.success) {
        await privyLogout();
        logout();
        clearUser();
        onClose();
      } else {
        setIsError(true);
        setMessage(response.data.error?.message || "회원 탈퇴에 실패했습니다.");
      }
    } catch (err: any) {
      setIsError(true);
      setMessage(err.response?.data?.error?.message || "서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold">
      <div className="bg-[#b0c4de] p-12 border-4 border-[#6b859e] w-[600px] max-w-[90%] shadow-[8px_8px_0px_#4a5d73] text-center relative pointer-events-auto">
        
        {/* 모달 닫기 버튼 */}
        <button 
          onClick={onClose} 
          className="absolute top-2 right-4 text-white text-3xl hover:text-red-600 drop-shadow-md"
        >
          &times;
        </button>

        <h2 className="text-slate-900 font-bold text-5xl mb-12">마이페이지</h2>

        {/* 닉네임 수정 영역 */}
        <div className="mb-12">
          <div className="flex gap-6">
            <input
              className={`flex-1 p-5 text-2xl bg-white text-black border-2 ${isError ? 'border-red-500' : 'border-slate-400'} outline-none focus:border-blue-500`}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setMessage("");
              }}
              maxLength={8}
            />
            <button 
              onClick={handleUpdateNickname}
              disabled={loading}
              className={`px-10 text-2xl font-bold border-b-4 border-r-4 active:border-0 active:translate-y-1 transition-all ${
                loading ? 'bg-slate-400 border-slate-500' : 'bg-[#6b859e] text-white border-[#3e5368]'
              }`}
            >
              {loading ? '...' : '수정하기'}
            </button>
          </div>
          {message && (
            <p className={`mt-4 text-xl ${isError ? 'text-red-500' : 'text-green-400'}`}>
              {message}
            </p>
          )}
        </div>

        {/* 로그아웃 & 회원탈퇴 버튼 */}
        <div className="flex justify-between gap-8 mt-6">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="flex-1 py-6 text-3xl font-bold bg-slate-500 text-white border-b-4 border-r-4 border-slate-600 active:border-0 active:translate-y-1 transition-all"
          >
            로그아웃
          </button>
          <button 
            onClick={() => setShowWithdrawConfirm(true)}
            className="flex-1 py-6 text-3xl font-bold bg-red-600 text-white border-b-4 border-r-4 border-red-800 active:border-0 active:translate-y-1 transition-all"
          >
            회원 탈퇴
          </button>
        </div>
      </div>

      {/* 로그아웃 확인 모달 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#8ea4b8]/80 font-dot pointer-events-auto">
          <div className="bg-[#b0c4de] p-8 border-4 border-[#6b859e] max-w-sm text-center shadow-[4px_4px_0px_#4a5d73]">
            <p className="text-slate-900 font-bold text-2xl mb-8">로그아웃 하시습니까?</p>
            <div className="flex gap-4">
              <button 
                onClick={handleLogout} 
                className="flex-1 py-2 bg-blue-600 text-white border-2 border-slate-900 hover:bg-blue-500"
              >
                확인
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                className="flex-1 py-2 bg-slate-500 text-white border-2 border-slate-900 hover:bg-slate-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 회원 탈퇴 확인 모달 */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#8ea4b8]/80 font-dot pointer-events-auto">
          <div className="bg-[#b0c4de] p-8 border-4 border-[#6b859e] max-w-sm text-center shadow-[4px_4px_0px_#4a5d73]">
            <p className="text-slate-900 font-bold text-xl mb-8 leading-relaxed">
              회원 탈퇴 시 재가입이 불가능합니다.<br/>탈퇴하시겠습니까?
            </p>
            <div className="flex gap-4">
              <button 
                onClick={handleWithdraw} 
                className="flex-1 py-2 bg-red-600 text-white border-2 border-black hover:bg-red-500"
              >
                확인
              </button>
              <button 
                onClick={() => setShowWithdrawConfirm(false)} 
                className="flex-1 py-2 bg-slate-600 text-white border-2 border-black hover:bg-slate-500"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
