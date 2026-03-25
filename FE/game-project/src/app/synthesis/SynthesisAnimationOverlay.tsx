"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface SynthesisAnimationCard {
  cardId: number;
  grade: string;
  imageUrl: string;
  name: string;
}

interface Props {
  resultCard: SynthesisAnimationCard;
  sourceGrade: string;
  isSuccess: boolean;
  onShowResult: () => void;
  onComplete: () => void;
}

const ELECTRIC_SYMBOLS = [
  '⚡', '⚡⚡', 'VOLT', 'ARC', 'ZAP', 'Ω', 'Hz', '+5V',
  'AC', 'DC', 'GND', 'flux', '⊕', '◈', 'wire', 'spark',
  'V', 'A', 'kW', 'coil', 'pulse', '∿∿', '▶▶', '+−',
];

interface FloatingSymbol {
  id: number;
  text: string;
  left: string;
  top: string;
  duration: string;
  fontSize: string;
  isWhite: boolean;
}

function OverlayContent({ resultCard, sourceGrade, isSuccess, onShowResult, onComplete }: Props) {
  const [phase, setPhase] = useState<'fusing' | 'result'>('fusing');
  const [progress, setProgress] = useState(0);
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);
  const symbolIdRef = useRef(0);

  // 전기 심볼: 화면 전체에 랜덤 배치
  useEffect(() => {
    if (phase !== 'fusing') return;
    const interval = setInterval(() => {
      const count = 2 + Math.floor(Math.random() * 2);
      setSymbols(prev => {
        const next = [...prev];
        for (let i = 0; i < count; i++) {
          next.push({
            id: symbolIdRef.current++,
            text: ELECTRIC_SYMBOLS[Math.floor(Math.random() * ELECTRIC_SYMBOLS.length)],
            left: `${2 + Math.random() * 93}%`,
            top: `${3 + Math.random() * 90}%`,
            duration: `${0.8 + Math.random() * 1.0}s`,
            fontSize: `${13 + Math.floor(Math.random() * 14)}px`,
            isWhite: Math.random() > 0.7,
          });
        }
        return next.slice(-40);
      });
    }, 100);
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
      background: 'rgba(0, 0, 0, 0.85)',
      zIndex: 99999,
      overflow: 'hidden',
    }}>
      {/* 전기 심볼 — 전체 화면 */}
      {phase === 'fusing' && symbols.map(s => (
        <span
          key={s.id}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            fontSize: s.fontSize,
            color: s.isWhite ? '#ffffff' : '#FFD700',
            fontFamily: "'Courier New', monospace",
            fontWeight: 'bold',
            opacity: 0,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            animation: `electric-float ${s.duration} ease-out forwards`,
            textShadow: s.isWhite
              ? '0 0 8px #ffffff, 0 0 16px rgba(255,255,255,0.5)'
              : '0 0 8px #FFD700, 0 0 16px rgba(255,215,0,0.6)',
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
        background: 'linear-gradient(160deg, #1a1500 0%, #0d0c00 100%)',
        border: phase === 'result' && isSuccess
          ? '2px solid #FFD700'
          : phase === 'result'
          ? '2px solid #ff4444'
          : '2px solid #5a4a00',
        borderRadius: '8px',
        padding: '32px 36px',
        width: '300px',
        textAlign: 'center',
        fontFamily: "'Courier New', monospace",
        boxShadow: phase === 'result' && isSuccess
          ? '0 0 60px rgba(255,215,0,0.35), inset 0 0 30px rgba(50,40,0,0.3)'
          : phase === 'result'
          ? '0 0 60px rgba(255,68,68,0.3), inset 0 0 30px rgba(50,0,0,0.3)'
          : '0 0 60px rgba(0,0,0,0.8), inset 0 0 30px rgba(50,40,0,0.2)',
        animation: 'synthesis-fadein 0.3s ease-out',
        transition: 'border-color 0.4s, box-shadow 0.4s',
        zIndex: 1,
      }}>
        {/* 상단 라벨 */}
        <div style={{
          color: '#7a6a00',
          fontSize: '11px',
          letterSpacing: '3px',
          marginBottom: '16px',
          textTransform: 'uppercase',
        }}>
          ── FUSION SYSTEM ──
        </div>

        {/* 카드 이미지 */}
        <div style={{
          display: 'inline-block',
          border: phase === 'result' && isSuccess
            ? '2px solid #FFD700'
            : phase === 'result'
            ? '2px solid #ff4444'
            : '2px solid #5a4a00',
          borderRadius: '4px',
          padding: '3px',
          marginBottom: '20px',
          boxShadow: phase === 'result' && isSuccess
            ? '0 0 20px rgba(255,215,0,0.5)'
            : phase === 'result'
            ? '0 0 20px rgba(255,68,68,0.3)'
            : 'none',
          transition: 'border-color 0.4s, box-shadow 0.4s',
        }}>
          <img
            src={resultCard.imageUrl}
            alt=""
            style={{
              width: '130px',
              height: '195px',
              objectFit: 'cover',
              imageRendering: 'pixelated',
              display: 'block',
              filter: phase === 'fusing'
                ? 'blur(6px) brightness(0.25)'
                : phase === 'result' && !isSuccess
                ? 'grayscale(70%) brightness(0.55)'
                : 'none',
              transition: 'filter 0.5s',
            }}
          />
        </div>

        {phase === 'fusing' ? (
          <>
            <div style={{ color: '#FFD700', fontSize: '16px', marginBottom: '14px', letterSpacing: '2px' }}>
              합성 중...
            </div>
            <div style={{
              background: '#0d0c00',
              border: '1px solid #5a4a00',
              height: '12px',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #aa8800, #FFD700)',
                height: '100%',
                width: `${progress}%`,
                transition: 'width 44ms linear',
                boxShadow: '0 0 8px rgba(255,215,0,0.7)',
              }} />
            </div>
            <div style={{ color: '#7a6a00', fontSize: '11px', marginTop: '6px' }}>
              {progress}%
            </div>
          </>
        ) : (
          <div style={{ animation: 'synthesis-result-in 0.35s ease-out' }}>
            <div style={{
              fontSize: '22px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              marginBottom: '6px',
              color: isSuccess ? '#FFD700' : '#ff4444',
              textShadow: isSuccess
                ? '0 0 16px rgba(255,215,0,0.8)'
                : '0 0 16px rgba(255,68,68,0.7)',
            }}>
              {isSuccess ? 'FUSION COMPLETE' : 'FUSION FAILED'}
            </div>
            <div style={{
              fontSize: '13px',
              color: isSuccess ? '#aa8800' : '#aa5a5a',
            }}>
              {isSuccess ? `[ ${sourceGrade} → ${resultCard.grade} 등급 ]` : '[ ERROR: 합성 실패 ]'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SynthesisAnimationOverlay(props: Props) {
  const [target] = useState<Element | null>(() => {
    if (typeof document === 'undefined') return null;
    return document.getElementById('portal-root');
  });

  if (!target) return null;
  return createPortal(<OverlayContent {...props} />, target);
}
