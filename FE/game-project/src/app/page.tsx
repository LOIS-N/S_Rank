"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";

function LoadingDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c >= 3 ? 1 : c + 1), 400);
    return () => clearInterval(id);
  }, []);
  return <span className="inline-block w-10 text-left">{'.'.repeat(count)}</span>;
}

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), { ssr: false });
const MainHUD = dynamic(() => import("@/components/MainHUD"), { ssr: false });

export default function Home() {
  const { login, authenticated, ready } = usePrivy();
  const { isAuthenticated, isNewUser, nickname } = useUserStore();
  const { gameStatus, setNickname, startGame, setGameStatus, isHUDModalOpen } = useGameStore();

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
      <div className="bg-black text-white h-screen flex items-center justify-center font-dot text-4xl">
        LOADING<LoadingDots />
      </div>
    );
  }

  // Privy 인증은 됐지만 BE 연동 대기 중 (useAuth.ts가 처리)
  const isSyncing = authenticated && !isAuthenticated;

  return (
    <main className="absolute inset-0 overflow-hidden bg-black text-white font-dot">
      <audio id="main-bgm" src="/assets/7번.mp3" preload="none" loop className="hidden" />

      {/* 0. 게임 캔버스 (배경) */}
      <div className="absolute inset-0 z-0">
        <GameCanvas />
      </div>

      {/* 1. 로그인 전 */}
      {!authenticated && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => login()}
            className="flex items-center gap-3 bg-white text-[#3c4043] px-5 py-2.5 rounded border border-[#dadce0] text-base font-semibold font-sans transition-colors shadow hover:bg-[#f8f9fa] hover:border-[#d2e3fc] active:bg-[#f1f3f4] translate-y-[115px]"
          >
            <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="w-5 h-5" />
            <span>Google로 계속하기</span>
          </button>
        </div>
      )}

      {/* 2. 서버 동기화 중 (Privy 로그인 완료 → BE 연동 대기) */}
      {isSyncing && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#8ea4b8]/80 font-dot text-white">
          <div className="w-16 h-16 border-8 border-t-yellow-400 border-white/20 rounded-full animate-spin mb-6" />
          <p className="text-2xl animate-pulse drop-shadow-md font-bold text-yellow-100">서버와 동기화 중...</p>
        </div>
      )}

      {/* HUD 모달 오픈 시 Phaser 캔버스 클릭 차단 (fixed → root 스태킹 컨텍스트에서 canvas z-0 위에 위치) */}
      {isHUDModalOpen && (
        <div className="fixed inset-0 z-[35] pointer-events-auto" />
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
