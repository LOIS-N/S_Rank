"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), { ssr: false });
const MainHUD = dynamic(() => import("@/components/MainHUD"), { ssr: false });

export default function Home() {
  const { login, authenticated, ready } = usePrivy();
  const { isAuthenticated, isNewUser, nickname } = useUserStore();
  const { gameStatus, setNickname, startGame, setGameStatus } = useGameStore();

  // Problem 1: 인증 완료 시 게임 상태 동기화 (useUserStore 기준)
  useEffect(() => {
    // 우리 서비스 인증 완료 + 기존 유저 → 게임 시작
    if (isAuthenticated && isNewUser === false && gameStatus !== 'PLAYING') {
      if (nickname) setNickname(nickname);
      startGame();
    }
    // 로그아웃 시 게임 상태 초기화
    if (!isAuthenticated && gameStatus === 'PLAYING') {
      setGameStatus('IDLE');
    }
  }, [isAuthenticated, isNewUser, nickname, gameStatus, setNickname, startGame, setGameStatus]);

  // 배경음악 자동 재생 (브라우저 정책 우회)
  useEffect(() => {
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

  // Privy SDK 초기화 전
  if (!ready) {
    return (
      <div className="bg-black text-white h-screen flex items-center justify-center font-dot text-2xl animate-pulse">
        LOADING...
      </div>
    );
  }

  // Privy 인증은 됐지만 BE 연동 대기 중 (useAuth.ts가 처리)
  const isSyncing = authenticated && !isAuthenticated;

  return (
    <main className="absolute inset-0 overflow-hidden bg-black text-white font-dot">
      <audio id="main-bgm" src="/assets/7번.mp3" autoPlay loop className="hidden" />

      {/* 0. 게임 캔버스 (배경) */}
      <div className="absolute inset-0 z-0">
        <GameCanvas />
      </div>

      {/* 1. 로그인 전 */}
      {!authenticated && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#8ea4b8]/60 p-4">
          <div className="flex flex-col items-center justify-center text-center">
            <h1 className="font-dot-s-bold text-5xl md:text-7xl lg:text-8xl text-white mb-10 leading-tight [text-shadow:4px_4px_0px_#4a5d73]">
              S급 개발자들이<br/>
              <span className="text-yellow-400">나를 따르는 이유에 대하여</span>
            </h1>
            <button
              onClick={() => login()}
              className="group flex items-center gap-3 bg-white text-black px-7 py-3 border-b-[6px] border-r-[6px] border-[#6b859e] text-xl sm:text-2xl font-bold active:border-0 active:translate-y-2 transition-all shadow-2xl hover:bg-slate-50"
            >
              <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="font-sans">GOOGLE LOGIN</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. 서버 동기화 중 (Privy 로그인 완료 → BE 연동 대기) */}
      {isSyncing && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#8ea4b8]/80 font-dot text-white">
          <div className="w-16 h-16 border-8 border-t-yellow-400 border-white/20 rounded-full animate-spin mb-6" />
          <p className="text-2xl animate-pulse drop-shadow-md font-bold text-yellow-100">서버와 동기화 중...</p>
        </div>
      )}

      {/* 3. 메인 HUD (PLAYING) */}
      {gameStatus === "PLAYING" && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <MainHUD />
        </div>
      )}
    </main>
  );
}
