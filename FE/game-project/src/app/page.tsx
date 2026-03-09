"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import UIOverlay from "@/components/UIOverlay";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), { ssr: false });

export default function Home() {
  const { gameStatus, login, setNickname, startGame } = useGameStore();
  const [inputValue, setInputValue] = useState("");

  const handleStart = () => {
    if (inputValue.trim()) {
      setNickname(inputValue);
      startGame();
    }
  };

  return (
    <main className="relative w-full h-full overflow-hidden bg-black">
      <GameCanvas />

      {gameStatus === "IDLE" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 p-4">
          {/* 일렁이는 애니메이션 적용 클래스: animate-float, animate-wavy */}
          <h1 className="font-dot text-4xl md:text-7xl text-white mb-10 text-center leading-tight animate-float">
            <span className="drop-shadow-[4px_4px_0px_#1e40af] inline-block animate-wavy">
              S급 개발자들이
            </span>
            <br/>
            <span className="text-yellow-400 drop-shadow-[4px_4px_0px_#92400e] inline-block animate-wavy" style={{ animationDelay: '0.2s' }}>
              나를 따르는 이유에 대하여
            </span>
          </h1>
          
          <button 
            onClick={login}
            className="font-dot flex items-center gap-4 bg-white text-black px-6 py-3 border-b-8 border-r-8 border-slate-400 active:border-0 active:translate-y-2 active:translate-x-2 transition-all shadow-2xl"
          >
            <img src="https://authjs.dev/img/providers/google.svg" className="w-5 h-5" alt="google" />
            <span className="text-xl md:text-2xl font-bold">확인하러 가기</span>
          </button>
          
          <p className="font-dot text-white mt-8 animate-pulse text-lg">Login to Start</p>
        </div>
      )}

      {/* 닉네임 입력 모달 (생략 - 기존 로직 유지) */}
      {gameStatus === "NICKNAME_INPUT" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4">
          <div className="font-dot bg-slate-800 p-6 border-4 border-white w-full max-w-sm">
            <h2 className="text-xl text-white mb-4 text-center">Name Your Startup</h2>
            <input
              autoFocus
              className="w-full p-2 bg-black text-green-400 border-2 border-slate-500 mb-4 text-center text-xl"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              maxLength={8}
            />
            <button onClick={handleStart} className="w-full bg-blue-600 text-white py-2 border-b-4 border-r-4 border-blue-900 active:border-0">Start Game</button>
          </div>
        </div>
      )}

      {gameStatus === "PLAYING" && <UIOverlay />}
    </main>
  );
}