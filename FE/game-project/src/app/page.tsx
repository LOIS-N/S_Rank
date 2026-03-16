"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), { ssr: false });
const MainHUD = dynamic(() => import("@/components/MainHUD"), { ssr: false });

export default function Home() {
  const { login, authenticated, user, ready, getAccessToken } = usePrivy();
  const { 
    gameStatus, setNickname, startGame, setWallet, 
    setGameStatus, setAuth, accessToken 
  } = useGameStore();
  
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const isProcessing = useRef(false);

  // 닉네임 유효성 검사 (2~8글자, 영어 대소문자, 한글, 숫자, 띄어쓰기 금지)
  const validateNickname = (name: string) => {
    const regex = /^[a-zA-Z0-9가-힣]{2,8}$/;
    return regex.test(name);
  };

  const syncWithBackend = useCallback(async () => {
    if (isProcessing.current || !authenticated || !user || accessToken) return;

    isProcessing.current = true;
    setIsSyncing(true);

    // [백엔드 연동 보류] BE 코드는 건드리지 않고 프론트엔드 단독 테스트가 가능하도록 fetch 로직 주석 처리
    /*
    try {
      const privyToken = await getAccessToken();
      const API_HOST = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      
      const response = await fetch(`${API_HOST}/api/v1/auth/login/privy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: privyToken,
          email: user.google?.email,
          oauthId: user.google?.subject,
          walletAddress: user.wallet?.address || ""
        }),
      });

      if (!response.ok) throw new Error("Server not responding");

      const result = await response.json();

      if (result.status === "OK") {
        setAuth(result.data.accessToken);
        setWallet(user.wallet?.address || "");
        if (result.data.isNewUser) {
          setGameStatus("NICKNAME_INPUT");
        } else {
          setNickname(result.data.nickname);
          setGameStatus("PLAYING");
        }
      }
    } catch (error) {
      console.error("Backend sync failed:", error);
    }
    */

    // 백엔드 통신 없이 순수 FE 작동을 위한 모킹 (0.5초 딜레이 UX 추가)
    setTimeout(() => {
      const isExistingUser = localStorage.getItem("mock_has_nickname");
      setWallet(user.wallet?.address || "Mock_Wallet_Address");
      setAuth("mock_jwt_token");

      if (isExistingUser) {
        setNickname(localStorage.getItem("mock_nickname") || "플레이어");
        setGameStatus("PLAYING");
      } else {
        setGameStatus("NICKNAME_INPUT");
      }
      setIsSyncing(false);
    }, 500);

  }, [authenticated, user, accessToken, getAccessToken, setAuth, setWallet, setGameStatus, setNickname]);

  useEffect(() => {
    if (ready && authenticated && !accessToken) {
      syncWithBackend();
    }
  }, [ready, authenticated, accessToken, syncWithBackend]);

  useEffect(() => {
    // 배경음악 강제 재생 로직 (브라우저 정책 우회용 터치/클릭 리스너)
    const audio = document.getElementById("main-bgm") as HTMLAudioElement;
    if (!audio) return;
    
    audio.volume = 0.5;

    const playAudio = () => {
      audio.play().catch(e => console.log('Audio play blocked:', e));
      window.removeEventListener('click', playAudio);
      window.removeEventListener('keydown', playAudio);
      window.removeEventListener('touchstart', playAudio);
    };

    window.addEventListener('click', playAudio);
    window.addEventListener('keydown', playAudio);
    window.addEventListener('touchstart', playAudio);

    audio.play().catch(() => {});

    return () => {
      window.removeEventListener('click', playAudio);
      window.removeEventListener('keydown', playAudio);
      window.removeEventListener('touchstart', playAudio);
    };
  }, []);

  const handleStartGame = async () => {
    const trimmed = inputValue.trim();
    if (!validateNickname(trimmed)) {
      setErrorMessage("2~8자의 영문 대소문자, 한글, 숫자만 가능합니다. (띄어쓰기 불가)");
      return;
    }

    setErrorMessage("");
    setIsSyncing(true);
    
    // 백엔드 요청 없이 바로 로컬 모킹 데이터 저장 및 화면 전환
    setTimeout(() => {
      localStorage.setItem("mock_has_nickname", "true");
      localStorage.setItem("mock_nickname", trimmed);

      setNickname(trimmed);
      setIsSyncing(false);
      startGame();
    }, 500);
  };

  if (!ready) return <div className="bg-black text-white h-screen flex items-center justify-center font-dot text-2xl animate-pulse">LOADING...</div>;

  return (
    <main className="relative w-full h-full overflow-hidden bg-black text-white font-dot">
      <audio id="main-bgm" src="/assets/7번.mp3" autoPlay loop className="hidden" />

      {/* 0. 게임 캔버스 (배경) */}
      <div className="absolute inset-0 z-0">
        <GameCanvas />
      </div>

      {/* 1. 로그인 전 (IDLE) */}
      {gameStatus === "IDLE" && !isSyncing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#8ea4b8]/60 p-4">
          <div className="flex flex-col items-center justify-center text-center">
            <h1 className="font-dot text-4xl md:text-6xl lg:text-7xl text-white mb-10 leading-tight [text-shadow:4px_4px_0px_#4a5d73]">
              S급 개발자들이<br/>
              <span className="text-yellow-400">나를 따르는 이유에 대하여</span>
            </h1>
            <button 
              onClick={() => login()} 
              className="group flex items-center gap-4 bg-white text-black px-10 py-5 border-b-8 border-r-8 border-[#6b859e] font-dot text-2xl sm:text-3xl font-bold active:border-0 active:translate-y-2 transition-all shadow-2xl hover:bg-slate-50"
            >
              <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="w-8 h-8 sm:w-10 sm:h-10" />
              <span>GOOGLE LOGIN</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. 동기화 중 (SERVER SYNC) / 로딩 */}
      {isSyncing && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#8ea4b8]/80 font-dot text-white">
          <div className="w-16 h-16 border-8 border-t-yellow-400 border-white/20 rounded-full animate-spin mb-6" />
          <p className="text-2xl animate-pulse drop-shadow-md font-bold text-yellow-100">서버와 동기화 중...</p>
        </div>
      )}

      {/* 3. 닉네임 입력 (NICKNAME_INPUT) */}
      {gameStatus === "NICKNAME_INPUT" && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-[#8ea4b8]/80 p-4 font-dot">
          <div className="bg-[#b0c4de] p-10 border-4 border-white w-full max-w-md shadow-[12px_12px_0px_#4a5d73] transition-all transform scale-110 sm:scale-125">
            <h2 className="text-slate-900 mb-6 text-center text-2xl sm:text-3xl font-bold">닉네임 설정하기</h2>
            <input
              autoFocus
              className="w-full p-4 bg-black text-green-400 border-4 border-slate-500 mb-4 text-center outline-none focus:border-yellow-400 text-2xl font-bold"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setErrorMessage("");
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleStartGame()}
              maxLength={8}
              placeholder="최대 8자 (공백 불가)"
            />
            {errorMessage && (
              <p className="text-red-600 text-lg mb-6 text-center font-bold animate-bounce">{errorMessage}</p>
            )}
            <button onClick={handleStartGame} className="w-full bg-[#6b859e] text-white py-5 border-b-6 border-r-6 border-[#3e5368] active:border-0 active:translate-y-1 transition-all mt-4 font-bold text-2xl shadow-lg">
              게임 시작
            </button>
          </div>
        </div>
      )}

      {/* 4. 메인 HUD (PLAYING) */}
      {gameStatus === "PLAYING" && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <MainHUD />
        </div>
      )}
    </main>
  );
}