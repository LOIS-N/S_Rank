"use client";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";

interface Props { onComplete: () => void; }

export default function TutorialQuestTimer({ onComplete }: Props) {
  const { tutorialQuestTimerSec, tutorialQuestTimerReward } = useGameStore();
  const [remaining, setRemaining] = useState(tutorialQuestTimerSec);

  useEffect(() => {
    setRemaining(tutorialQuestTimerSec);
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    const timeout = setTimeout(onComplete, tutorialQuestTimerSec * 1000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialQuestTimerSec]);

  const progress = tutorialQuestTimerSec > 0 ? (tutorialQuestTimerSec - remaining) / tutorialQuestTimerSec : 1;

  return (
    <div
      className="absolute inset-0 pointer-events-none font-dot"
      style={{ zIndex: 300 }}
    >
      {/* 게임 화면(people)이 보이도록 작은 위젯으로 표시 — 하단 중앙 */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(var(--game-clip-y, 0px) + 7cqw)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#FFFCE4',
          border: '4px solid #6b859e',
          boxShadow: '6px 6px 0 #4a5d73',
          padding: '1.0cqw 2.2cqw 1.2cqw',
          textAlign: 'center',
          minWidth: '18cqw',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '1.0cqw', color: '#6b859e', marginBottom: '0.5cqw', letterSpacing: '0.08em' }}>
          [ 퀘스트 진행 중 ]
        </div>
        <div style={{ fontSize: '2.8cqw', color: '#1a1a1a', fontWeight: 'bold', marginBottom: '0.6cqw' }}>
          {remaining}s
        </div>
        <div style={{ height: '0.5cqw', background: 'rgba(0,0,0,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: '#6b859e',
            transition: 'width 1s linear',
          }} />
        </div>
        {tutorialQuestTimerReward > 0 && (
          <div style={{ fontSize: '0.9cqw', color: '#8B6914', marginTop: '0.5cqw' }}>
            보상 예정: {tutorialQuestTimerReward.toLocaleString()}G
          </div>
        )}
      </div>
    </div>
  );
}
