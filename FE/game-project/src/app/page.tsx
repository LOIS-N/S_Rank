<<<<<<< HEAD
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

  // 백엔드 연동 전, 프론트 작업을 위해 강제로 다음 단계로 넘기는 설정
  // 백엔드 연동 전 임시 주석 처리
  // const isDevMode = true; 

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

    // [백엔드 연동 보류] BE 지원 없이 FE 단독 구동을 위해 fetch 주석 처리
    /*
    try {
      const API_HOST = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      await fetch(`${API_HOST}/api/v1/users/nickname`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ nickname: trimmed })
      });
    } catch (e) {
      console.error("Nickname sync error - using local fallback", e);
    }
    */
    
    // 백엔드 요청 없이 바로 로컬 모킹 데이터 저장 및 화면 전환
    setTimeout(() => {
      localStorage.setItem("mock_has_nickname", "true");
      localStorage.setItem("mock_nickname", trimmed);

      setNickname(trimmed);
      setIsSyncing(false);
      startGame();
    }, 500);
  };

  // 실제 상용시 로딩 (ready 검사)
  if (!ready) return <div className="bg-black text-white h-screen flex items-center justify-center font-dot">LOADING...</div>;

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
          <h1 className="font-dot text-4xl md:text-6xl text-white mb-10 text-center leading-tight [text-shadow:2px_2px_0px_#4a5d73]">
            S급 개발자들이<br/>
            <span className="text-yellow-400">나를 따르는 이유에 대하여</span>
          </h1>
          <button onClick={() => login()} className="flex items-center gap-3 bg-white text-black px-8 py-4 border-b-8 border-r-8 border-[#6b859e] font-dot text-2xl font-bold active:border-0 active:translate-y-2 transition-all shadow-lg hover:bg-slate-50">
            <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="w-8 h-8" />
            <span>GOOGLE LOGIN</span>
          </button>
        </div>
      )}

      {/* 2. 동기화 중 (SERVER SYNC) */}
      {isSyncing && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#8ea4b8]/80 font-dot text-white">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-white rounded-full animate-spin mb-4" />
          <p className="animate-pulse drop-shadow-md">서버와 동기화 중...</p>
        </div>
      )}

      {/* 3. 닉네임 입력 (NICKNAME_INPUT) */}
      {gameStatus === "NICKNAME_INPUT" && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-[#8ea4b8]/80 p-4 font-dot">
          <div className="bg-[#b0c4de] p-8 border-4 border-white w-full max-w-sm shadow-[8px_8px_0px_#4a5d73]">
            <h2 className="text-slate-900 mb-4 text-center text-xl font-bold">닉네임 설정하기</h2>
            <input
              autoFocus
              className="w-full p-3 bg-black text-green-400 border-2 border-slate-500 mb-2 text-center outline-none focus:border-blue-500"
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
              <p className="text-red-500 text-sm mb-4 text-center">{errorMessage}</p>
            )}
            <button onClick={handleStartGame} className="w-full bg-[#6b859e] text-white py-4 border-b-4 border-r-4 border-[#3e5368] active:border-0 active:translate-y-1 transition-all mt-4 font-bold text-xl">
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
=======
export default function Home() {
  return (
    <main style={{ padding: "40px" }}>
      <h1 style={{ fontSize: "32px", fontWeight: "bold" }}>
        게임 프로젝트 시작
      </h1>
      <p style={{ marginTop: "12px" }}>
        Next.js가 정상적으로 실행되고 있습니다.
      </p>
>>>>>>> aa0652b9b70407d5264f3f9930be0a4892751961
    </main>
  );
}