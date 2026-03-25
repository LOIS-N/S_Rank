"use client";
import { useState, useEffect, useRef } from "react";

// --- Types ---
interface CardSkill {
  skillType: string;
  value: number;
}

export interface GachaRevealCardData {
  grade: string;
  name: string;
  imageUrl: string;
  skill1: CardSkill;
  skill2: CardSkill;
  skill3: CardSkill;
}

interface GachaRevealCardProps {
  card: GachaRevealCardData;
  revealDelay: number;
  statFontSize?: number;
  /** true면 플립 없이 즉시 앞면(공개 상태)으로 표시 */
  instantReveal?: boolean;
}

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// --- Helpers ---
function displaySkillType(type: string): string {
  return type.toUpperCase() === 'DEVOPS' ? 'DEV' : type.toUpperCase();
}

function normalizeSkillType(type: string): string {
  const upper = type.toUpperCase();
  return upper === 'DEV' || upper === 'DEVOPS' ? 'DEVOPS' : upper;
}

function getSkillIcon(type: string): string {
  return `${ASSET_BASE}/assets/003-01/${normalizeSkillType(type).toLowerCase()}.webp`;
}

const SKILL_ICON_STYLE = { height: '1em', width: 'auto', verticalAlign: 'middle' as const, imageRendering: 'pixelated' as const, display: 'inline-block' };

const GRADE_BORDER: Record<string, string> = {
  S: 'conic-gradient(from var(--gacha-border-angle, 0deg), #b9f2ff, #00e5ff, #ffffff, #76d7ff, #00e5ff, #b9f2ff)',
  A: 'conic-gradient(from var(--gacha-border-angle, 0deg), #ffd700, #ffec80, #b8860b, #fff4b0, #ffd700, #ffd700)',
  B: 'conic-gradient(from var(--gacha-border-angle, 0deg), #c0c0c0, #e8e8e8, #888888, #f0f0f0, #c0c0c0, #c0c0c0)',
  C: 'conic-gradient(from var(--gacha-border-angle, 0deg), #cd7f32, #e8a860, #8b4513, #daa06d, #cd7f32, #cd7f32)',
  D: 'conic-gradient(from var(--gacha-border-angle, 0deg), #1a3a8a, #2b5fcf, #0d2266, #3a7af0, #1a3a8a, #1a3a8a)',
};

const GRADE_GLOW: Record<string, string> = {
  S: 'drop-shadow(0 0 12px rgba(0,229,255,0.7))',
  A: 'drop-shadow(0 0 10px rgba(255,215,0,0.6))',
  B: 'drop-shadow(0 0 8px rgba(192,192,192,0.6))',
  C: 'drop-shadow(0 0 8px rgba(205,127,50,0.5))',
  D: 'drop-shadow(0 0 8px rgba(26,58,138,0.6))',
};

// Inject keyframes once (reuses --gacha-border-angle from gacha.css)
const STYLE_ID = 'gacha-reveal-card-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes grcSShake {
      0%   { transform: rotateY(0deg) translateX(0); }
      10%  { transform: rotateY(0deg) translateX(-4px) rotate(-1deg); }
      20%  { transform: rotateY(0deg) translateX(4px) rotate(1deg); }
      30%  { transform: rotateY(0deg) translateX(-5px) rotate(-1.5deg); }
      40%  { transform: rotateY(0deg) translateX(5px) rotate(1.5deg); }
      50%  { transform: rotateY(0deg) translateX(-6px) rotate(-2deg); }
      60%  { transform: rotateY(0deg) translateX(6px) rotate(2deg); }
      70%  { transform: rotateY(0deg) translateX(-7px) rotate(-2.5deg); }
      80%  { transform: rotateY(0deg) translateX(7px) rotate(2.5deg); }
      90%  { transform: rotateY(0deg) translateX(-3px) rotate(-1deg); }
      100% { transform: rotateY(0deg) translateX(0) rotate(0deg); }
    }
    @keyframes grcSBorderPulse {
      0%   { border-color: rgba(255,215,0,0.4); }
      100% { border-color: rgba(255,215,0,1); }
    }
    @keyframes grcABorderPulse {
      0%   { border-color: rgba(133,193,233,0.3); }
      100% { border-color: rgba(133,193,233,0.8); }
    }
    @keyframes grcSFlash {
      0%   { opacity: 1; transform: scale(0.8); }
      50%  { opacity: 0.8; transform: scale(1.5); }
      100% { opacity: 0; transform: scale(2); }
    }
    @keyframes grcAFlash {
      0%   { opacity: 1; transform: scale(0.8); }
      50%  { opacity: 0.6; transform: scale(1.3); }
      100% { opacity: 0; transform: scale(1.8); }
    }
    @keyframes grcSIdleGlow {
      0%   { box-shadow: 0 0 15px rgba(255,215,0,0.3), 0 0 30px rgba(255,215,0,0.15); }
      100% { box-shadow: 0 0 25px rgba(255,215,0,0.5), 0 0 50px rgba(255,215,0,0.25); }
    }
    @keyframes grcParticle0 {
      0%   { opacity: 1; transform: translate(-50%,-50%) translate(0,0) scale(1); }
      100% { opacity: 0; transform: translate(-50%,-50%) translate(-60px,-80px) scale(0); }
    }
    @keyframes grcParticle1 {
      0%   { opacity: 1; transform: translate(-50%,-50%) translate(0,0) scale(1); }
      100% { opacity: 0; transform: translate(-50%,-50%) translate(70px,-60px) scale(0); }
    }
    @keyframes grcParticle2 {
      0%   { opacity: 1; transform: translate(-50%,-50%) translate(0,0) scale(1); }
      100% { opacity: 0; transform: translate(-50%,-50%) translate(-50px,70px) scale(0); }
    }
    @keyframes grcParticle3 {
      0%   { opacity: 1; transform: translate(-50%,-50%) translate(0,0) scale(1); }
      100% { opacity: 0; transform: translate(-50%,-50%) translate(80px,50px) scale(0); }
    }
  `;
  document.head.appendChild(style);
}

// --- Component ---
export function GachaRevealCard({ card, revealDelay, statFontSize = 12, instantReveal = false }: GachaRevealCardProps) {
  const [phase, setPhase] = useState<'hidden' | 'pre' | 'flipping' | 'revealed'>(
    instantReveal ? 'revealed' : 'hidden'
  );
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const grade = card.grade;

  useEffect(() => {
    if (instantReveal) {
      setPhase('revealed');
      return;
    }

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase('hidden');

    if (grade === 'S') {
      timersRef.current = [
        setTimeout(() => setPhase('pre'), revealDelay),
        setTimeout(() => setPhase('flipping'), revealDelay + 1200),
        setTimeout(() => setPhase('revealed'), revealDelay + 2000),
      ];
    } else if (grade === 'A') {
      timersRef.current = [
        setTimeout(() => setPhase('pre'), revealDelay),
        setTimeout(() => setPhase('flipping'), revealDelay + 600),
        setTimeout(() => setPhase('revealed'), revealDelay + 1200),
      ];
    } else {
      timersRef.current = [
        setTimeout(() => setPhase('flipping'), revealDelay),
        setTimeout(() => setPhase('revealed'), revealDelay + 500),
      ];
    }

    return () => timersRef.current.forEach(clearTimeout);
  }, [revealDelay, grade, card.imageUrl, instantReveal]);

  const isFlipped = phase === 'flipping' || phase === 'revealed';
  const isPre = phase === 'pre';
  const isRevealed = phase === 'revealed';

  const flipTransition =
    grade === 'S' ? 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)' :
    grade === 'A' ? 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' :
    'transform 0.5s ease-in-out';

  const preBoxShadow = isPre
    ? grade === 'S' ? '0 0 30px rgba(255,215,0,0.6), 0 0 60px rgba(255,215,0,0.3)'
    : grade === 'A' ? '0 0 20px rgba(133,193,233,0.5), 0 0 40px rgba(133,193,233,0.2)'
    : '2px 2px 0 rgba(0,0,0,0.5)'
    : '2px 2px 0 rgba(0,0,0,0.5)';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', perspective: '800px', overflow: 'visible' }}>

      {/* Grade border removed */}

      {/* S-grade burst particles */}
      {grade === 'S' && isRevealed && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30, overflow: 'visible' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute', left: '50%', top: '50%',
              width: 6, height: 6, borderRadius: '50%',
              background: i % 3 === 0 ? '#ffd700' : i % 3 === 1 ? '#fff' : '#ffec80',
              animation: `grcParticle${i % 4} 1s ease-out forwards`,
              opacity: 0,
            }} />
          ))}
        </div>
      )}

      {/* S-grade golden flash on flip */}
      {grade === 'S' && (phase === 'flipping' || isRevealed) && (
        <div style={{
          position: 'absolute', top: -20, left: -20, right: -20, bottom: -20,
          pointerEvents: 'none', zIndex: 20, borderRadius: 12,
          background: 'radial-gradient(circle, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0) 70%)',
          animation: 'grcSFlash 0.8s ease-out forwards',
        }} />
      )}

      {/* A-grade blue flash on flip */}
      {grade === 'A' && (phase === 'flipping' || isRevealed) && (
        <div style={{
          position: 'absolute', top: -12, left: -12, right: -12, bottom: -12,
          pointerEvents: 'none', zIndex: 20, borderRadius: 12,
          background: 'radial-gradient(circle, rgba(133,193,233,0.4) 0%, rgba(133,193,233,0) 70%)',
          animation: 'grcAFlash 0.6s ease-out forwards',
        }} />
      )}

      {/* S-grade persistent idle glow */}
      {grade === 'S' && isRevealed && (
        <div style={{
          position: 'absolute', top: -8, left: -8, right: -8, bottom: -8,
          pointerEvents: 'none', zIndex: 10, borderRadius: 4,
          animation: 'grcSIdleGlow 2s ease-in-out infinite alternate',
        }} />
      )}

      {/* Card flip container */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transition: flipTransition,
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        animation: isPre && grade === 'S' ? 'grcSShake 1.2s ease-in-out' : undefined,
      }}>

        {/* FRONT: face-down card back (portfolio image) */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden',
          boxShadow: preBoxShadow,
          transition: 'box-shadow 0.3s',
          overflow: 'hidden',
        }}>
          <img
            src="/assets/006/portfolio_000.webp"
            alt="card back"
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }}
          />

          {/* S-grade: pulsing gold border during pre */}
          {isPre && grade === 'S' && (
            <div style={{
              position: 'absolute', inset: -3, pointerEvents: 'none',
              border: '3px solid rgba(255,215,0,0.8)',
              animation: 'grcSBorderPulse 0.4s ease-in-out infinite alternate',
            }} />
          )}
          {/* A-grade: pulsing blue border during pre */}
          {isPre && grade === 'A' && (
            <div style={{
              position: 'absolute', inset: -3, pointerEvents: 'none',
              border: '3px solid rgba(133,193,233,0.7)',
              animation: 'grcABorderPulse 0.3s ease-in-out infinite alternate',
            }} />
          )}
        </div>

        {/* BACK: revealed card */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          filter: isRevealed ? (GRADE_GLOW[grade] ?? undefined) : undefined,
        }}>
          <img
            src={card.imageUrl} alt={card.name} draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' }}
          />
          <span className="gacha-card-stat stat-1" style={{ fontSize: statFontSize }}>
            <img src={getSkillIcon(card.skill1.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill1.skillType)} {card.skill1.value}
          </span>
          <span className="gacha-card-stat stat-2" style={{ fontSize: statFontSize }}>
            <img src={getSkillIcon(card.skill2.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill2.skillType)} {card.skill2.value}
          </span>
          <span className="gacha-card-stat stat-3" style={{ fontSize: statFontSize }}>
            <img src={getSkillIcon(card.skill3.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill3.skillType)} {card.skill3.value}
          </span>
        </div>
      </div>
    </div>
  );
}
