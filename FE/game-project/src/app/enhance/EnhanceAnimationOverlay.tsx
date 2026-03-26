"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface EnhanceAnimationCard {
  cardId: number;
  grade: string;
  imageUrl: string;
}

interface StatChange {
  skillType: string;
  before: number;
  after: number;
  delta: number;
}

interface Props {
  card: EnhanceAnimationCard;
  isSuccess: boolean;
  statChanges?: StatChange[];
  onShowResult: () => void;
  onComplete: () => void;
}

const CODE_SNIPPETS = [
  'const', '{ }', 'if()', 'for', '=>', '[ ]', '&&', '//',
  'null', 'true', 'false', 'npm i', 'git push', 'merge',
  'async', 'await', '.map()', 'try{ }', 'catch', 'import',
  'class', 'return', '!==', '++', 'export', 'new',
  'void', 'int', 'def', 'pull', 'commit', 'fetch',
];

interface FloatingSnippet {
  id: number;
  text: string;
  left: string;
  top: string;
  duration: string;
  fontSize: string;
  opacity: string;
}

function OverlayContent({ card, isSuccess, statChanges, onShowResult, onComplete }: Props) {
  const [phase, setPhase] = useState<'compiling' | 'result'>('compiling');
  const [progress, setProgress] = useState(0);
  const [snippets, setSnippets] = useState<FloatingSnippet[]>([]);
  const snippetIdRef = useRef(0);

  // 코드 조각: 화면 전체에 랜덤 배치
  useEffect(() => {
    if (phase !== 'compiling') return;
    const interval = setInterval(() => {
      const count = 2 + Math.floor(Math.random() * 2); // 한 번에 2~3개
      setSnippets(prev => {
        const next = [...prev];
        for (let i = 0; i < count; i++) {
          next.push({
            id: snippetIdRef.current++,
            text: CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)],
            left: `${2 + Math.random() * 93}%`,
            top: `${3 + Math.random() * 90}%`,
            duration: `${1.0 + Math.random() * 1.0}s`,
            fontSize: `${13 + Math.floor(Math.random() * 12)}px`,
            opacity: `${0.5 + Math.random() * 0.5}`,
          });
        }
        return next.slice(-40);
      });
    }, 110);
    return () => clearInterval(interval);
  }, [phase]);

  // 프로그레스 바
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => Math.min(100, prev + 2));
    }, 44);
    return () => clearInterval(interval);
  }, []);

  // 페이즈 전환 타이머
  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('result');
      onShowResult();
    }, 2300);
    const t2 = setTimeout(() => {
      onComplete();
    }, 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      zIndex: 99999,
      overflow: 'hidden',
    }}>
      {/* 코드 조각 — 전체 화면에 분포 */}
      {phase === 'compiling' && snippets.map(s => (
        <span
          key={s.id}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            fontSize: s.fontSize,
            color: '#00ff41',
            fontFamily: "'Courier New', monospace",
            fontWeight: Math.random() > 0.5 ? 'bold' : 'normal',
            opacity: 0,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            animation: `code-float ${s.duration} ease-out forwards`,
            textShadow: '0 0 8px #00ff41, 0 0 16px rgba(0,255,65,0.6)',
          }}
        >
          {s.text}
        </span>
      ))}

      {/* 중앙 모달 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'linear-gradient(160deg, #1a1a2e 0%, #0f0f1a 100%)',
        border: '2px solid #3a3a6a',
        borderRadius: '8px',
        padding: 'clamp(16px, 4vw, 32px) clamp(18px, 5vw, 36px)',
        width: 'min(300px, 85vw)',
        textAlign: 'center',
        fontFamily: "'Courier New', monospace",
        boxShadow: '0 0 60px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,50,0.3)',
        animation: 'enhance-fadein 0.3s ease-out',
        zIndex: 1,
      }}>
        {/* 상단 라벨 */}
        <div style={{
          color: '#7a7aaa',
          fontSize: '11px',
          letterSpacing: '3px',
          marginBottom: '16px',
          textTransform: 'uppercase',
        }}>
          ── ENHANCE SYSTEM ──
        </div>

        {/* 카드 이미지 */}
        <div style={{
          position: 'relative',
          display: 'inline-block',
          border: phase === 'result' && isSuccess
            ? '2px solid #00ff41'
            : phase === 'result'
            ? '2px solid #ff4444'
            : '2px solid #3a3a6a',
          borderRadius: '4px',
          padding: '3px',
          marginBottom: '20px',
          boxShadow: phase === 'result' && isSuccess
            ? '0 0 20px rgba(0,255,65,0.4)'
            : phase === 'result'
            ? '0 0 20px rgba(255,68,68,0.3)'
            : 'none',
          transition: 'border-color 0.4s, box-shadow 0.4s',
        }}>
          <img
            src={card.imageUrl}
            alt=""
            style={{
              width: 'clamp(80px, 20vw, 130px)',
              height: 'clamp(120px, 30vw, 195px)',
              objectFit: 'cover',
              imageRendering: 'pixelated',
              display: 'block',
              filter: phase === 'result' && !isSuccess ? 'grayscale(70%) brightness(0.55)' : 'none',
              transition: 'filter 0.4s',
            }}
          />
          {/* 스탯 — 항상 카드 이미지 위에 오버레이 (compiling: before값, result: 변화 표시) */}
          {statChanges && statChanges.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: i === 0 ? '26%' : i === 1 ? '16%' : '5%',
                textAlign: 'center',
                fontSize: '11px',
                fontFamily: "'Courier New', monospace",
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 4px #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                animation: phase === 'result' ? 'enhance-result-in 0.35s ease-out' : undefined,
              }}
            >
              <span style={{ color: '#aaddff' }}>
                {s.skillType === 'DEVOPS' ? 'DEV' : s.skillType}
              </span>
              {' '}
              {phase === 'compiling' ? (
                <span style={{ color: '#cccccc' }}>{s.before}</span>
              ) : (
                <>
                  <span style={{ color: '#cccccc' }}>{s.before}→{s.after}</span>
                  {' '}
                  <span style={{ color: s.delta > 0 ? '#00ff41' : '#888888' }}>
                    {s.delta > 0 ? `+${s.delta}` : '±0'}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        {phase === 'compiling' ? (
          <>
            <div style={{ color: '#00ff41', fontSize: '16px', marginBottom: '14px', letterSpacing: '2px' }}>
              컴파일 중...
            </div>
            <div style={{
              background: '#0a0a14',
              border: '1px solid #2a2a5a',
              height: '12px',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #00aa22, #00ff41)',
                height: '100%',
                width: `${progress}%`,
                transition: 'width 44ms linear',
                boxShadow: '0 0 8px rgba(0,255,65,0.6)',
              }} />
            </div>
            <div style={{ color: '#3a7a3a', fontSize: '11px', marginTop: '6px' }}>
              {progress}%
            </div>
          </>
        ) : (
          <div style={{ animation: 'enhance-result-in 0.35s ease-out' }}>
            <div style={{
              fontSize: '26px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              marginBottom: '6px',
              color: isSuccess ? '#00ff41' : '#ff4444',
              textShadow: isSuccess
                ? '0 0 16px rgba(0,255,65,0.7)'
                : '0 0 16px rgba(255,68,68,0.7)',
            }}>
              {isSuccess ? 'BUILD SUCCESS' : 'BUILD FAILED'}
            </div>
            <div style={{
              fontSize: '13px',
              color: isSuccess ? '#5aaa5a' : '#aa5a5a',
            }}>
              {isSuccess ? '[ 강화 성공 ]' : '[ ERROR: 강화 실패 ]'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function EnhanceAnimationOverlay(props: Props) {
  // useState 초기화 함수: 첫 렌더 시 동기적으로 실행 → useEffect/타이밍 이슈 없음
  // game-wrapper의 transform 영향을 받지 않는 #portal-root (layout.tsx에서 game-wrapper 바깥에 위치)에 렌더링
  const [target] = useState<Element | null>(() => {
    if (typeof document === 'undefined') return null;
    return document.getElementById('portal-root');
  });

  if (!target) return null;
  return createPortal(<OverlayContent {...props} />, target);
}
