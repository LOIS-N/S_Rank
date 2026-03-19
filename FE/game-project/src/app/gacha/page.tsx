"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import { GachaRevealCard } from "./GachaRevealCard";
import "./gacha.css";

// --- Types ---
type TabType = 'flyer' | 'fair' | 'public';
type PhaseType = 'select' | 'result_1' | 'result_10';
type EffectGrade = 'A' | 'S';

const TAB_TO_TYPE_ID: Record<TabType, string> = {
  flyer: 'FLYER',
  fair: 'EXPO',
  public: 'OPEN_RECRUIT',
};

const GACHA_COSTS: Record<TabType, { single: number; ten: number }> = {
  flyer: { single: 10000, ten: 90000 },
  fair: { single: 15000, ten: 135000 },
  public: { single: 40000, ten: 360000 },
};

interface CardSkill {
  skillType: string;
  value: number;
}

interface GachaCardResult {
  cardId: number;
  grade: string;
  name: string;
  imageUrl: string;
  skill1: CardSkill;
  skill2: CardSkill;
  skill3: CardSkill;
  specialAbility: { name: string; description: string; effects: string } | null;
}

// --- Phaser Particle Effect Overlay ---
// A등급: 1초, S등급: 2초 파티클 연출
function GachaEffectOverlay({ grade, onDone }: { grade: EffectGrade; onDone: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const duration = grade === 'S' ? 2000 : 1000;
    let game: { destroy: (b: boolean) => void } | null = null;
    let mounted = true;

    (async () => {
      const Phaser = (await import('phaser')).default;
      if (!mounted || !el) return;

      const w = 1280;
      const h = 720;
      const mainColor = grade === 'S' ? 0x00e5ff : 0xffd700;
      const subColor = grade === 'S' ? 0xffffff : 0xffec80;
      const qty = grade === 'S' ? 8 : 5;
      const emitDur = duration - 200;
      const gradeLocal = grade;

      game = new Phaser.Game({
        type: Phaser.CANVAS,
        width: w,
        height: h,
        transparent: true,
        parent: el,
        banner: false,
        audio: { noAudio: true },
        scene: {
          create(this: Phaser.Scene) {
            const gfx = this.make.graphics({ x: 0, y: 0 });
            gfx.fillStyle(0xffffff, 1);
            gfx.fillCircle(8, 8, 8);
            gfx.generateTexture('gachaDot', 16, 16);
            gfx.destroy();

            const cx = w / 2;
            const cy = h / 2;

            this.add.particles(cx, cy, 'gachaDot', {
              speed: { min: 150, max: 500 },
              angle: { min: 0, max: 360 },
              scale: { start: 1.2, end: 0 },
              alpha: { start: 1, end: 0 },
              lifespan: { min: 600, max: duration },
              quantity: qty,
              frequency: 40,
              tint: [mainColor, subColor],
              gravityY: 100,
              duration: emitDur,
            });

            if (gradeLocal === 'S') {
              const corners: [number, number][] = [
                [w * 0.1, h * 0.2],
                [w * 0.9, h * 0.2],
                [w * 0.1, h * 0.8],
                [w * 0.9, h * 0.8],
              ];
              for (const [px, py] of corners) {
                this.add.particles(px, py, 'gachaDot', {
                  speed: { min: 80, max: 250 },
                  angle: { min: 0, max: 360 },
                  scale: { start: 0.7, end: 0 },
                  alpha: { start: 1, end: 0 },
                  lifespan: { min: 400, max: 1200 },
                  quantity: 3,
                  frequency: 80,
                  tint: [mainColor, subColor],
                  gravityY: 60,
                  duration: emitDur,
                });
              }
            }
          }
        }
      });
    })();

    const timer = setTimeout(() => {
      onDoneRef.current();
    }, duration + 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
      game?.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}

// --- Main Page ---
export default function GachaPage() {
  const [currentTab, setCurrentTab] = useState<TabType>('flyer');
  const [phase, setPhase] = useState<PhaseType>('select');
  const { gold, coffee, setResources, increaseGold, openComingSoonModal, accessToken } = useGameStore();
  const { getAccessToken } = usePrivy();
  const [drawnCards, setDrawnCards] = useState<GachaCardResult[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [gachaEffect, setGachaEffect] = useState<EffectGrade | null>(null);

  const canPull1 = gold >= GACHA_COSTS[currentTab].single;
  const canPull10 = gold >= GACHA_COSTS[currentTab].ten;

  const getAuthToken = useCallback(async () => {
    return accessToken || await getAccessToken();
  }, [accessToken, getAccessToken]);

  // --- 뽑기 API 호출 ---
  const handlePull = async (count: 1 | 10) => {
    if (isPulling) return;
    const cost = count === 1 ? GACHA_COSTS[currentTab].single : GACHA_COSTS[currentTab].ten;
    if (gold < cost) return;

    setIsPulling(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/v1/gacha/draws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: TAB_TO_TYPE_ID[currentTab], count }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let msg = `오류 (${res.status})`;
        try {
          const errorBody = JSON.parse(errorText);
          msg = errorBody?.error?.message || errorBody?.message || msg;
        } catch {
          // non-JSON body (e.g. nginx 502)
        }
        console.error(`[가챠] ${count}회 뽑기 실패 — HTTP ${res.status}`, errorText);
        alert(msg);
        return;
      }

      const resData = await res.json();
      const drawData = resData.data ?? resData;

      if (drawData?.cards) {
        const normalized: GachaCardResult[] = drawData.cards.map((c: Record<string, unknown>) => {
          const s1 = c.skill1 as Record<string, unknown>;
          const s2 = c.skill2 as Record<string, unknown>;
          const s3 = c.skill3 as Record<string, unknown>;
          return {
            ...c,
            skill1: { skillType: (s1?.skillType || s1?.type) as string, value: s1?.value as number },
            skill2: { skillType: (s2?.skillType || s2?.type) as string, value: s2?.value as number },
            skill3: { skillType: (s3?.skillType || s3?.type) as string, value: s3?.value as number },
          };
        });

        if (drawData.remainingGold != null) {
          setResources(drawData.remainingGold as number, coffee);
        } else {
          increaseGold(-cost);
        }

        setDrawnCards(normalized);
        setSelectedCardIndex(null);
        setPhase(count === 1 ? 'result_1' : 'result_10');

        // A/S 등급 Phaser 파티클 효과 (S 우선)
        const hasS = normalized.some(c => c.grade === 'S');
        const hasA = normalized.some(c => c.grade === 'A');
        if (hasS) setGachaEffect('S');
        else if (hasA) setGachaEffect('A');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown }; message?: string };
      const errData = e.response?.data as Record<string, unknown> | undefined;
      alert((errData?.message as string) || e.message || '뽑기에 실패했습니다.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleReturn = () => {
    setDrawnCards([]);
    setSelectedCardIndex(null);
    setPhase('select');
  };

  // 뽑기 버튼 (1회 / 10회)
  const PullButtons = () => (
    <>
      <div
        className={`gacha-action-btn${!canPull1 || isPulling ? ' btn-disabled' : ''}`}
        style={{ backgroundImage: 'url(/assets/006/gachaButton_000.webp)' }}
        onClick={canPull1 && !isPulling ? () => handlePull(1) : undefined}
      >
        <span>1회 뽑기</span>
        <span className="btn-subtitle">({GACHA_COSTS[currentTab].single.toLocaleString()}G)</span>
      </div>
      <div
        className={`gacha-action-btn btn-10pull${!canPull10 || isPulling ? ' btn-disabled' : ''}`}
        style={{ backgroundImage: 'url(/assets/006/gachaButton_000.webp)' }}
        onClick={canPull10 && !isPulling ? () => handlePull(10) : undefined}
      >
        <span>10회 뽑기</span>
        <span className="btn-subtitle">({GACHA_COSTS[currentTab].ten.toLocaleString()}G)</span>
      </div>
    </>
  );

  return (
    <div className="gacha-page-container">

      {/* Phaser 파티클 효과 오버레이 (A/S 등급 시) */}
      {gachaEffect && (
        <GachaEffectOverlay
          grade={gachaEffect}
          onDone={() => setGachaEffect(null)}
        />
      )}

      <div className={`gacha-content gacha-bg-${currentTab}`}>

        {/* 좌측 상단 골드 HUD */}
        <div className="gacha-gold-hud">
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <img
              src="/assets/002/coin_002.webp"
              alt="gold"
              style={{
                width: '5cqw',
                height: '5cqw',
                imageRendering: 'pixelated',
              }}
            />
            <div
              style={{
                width: '15cqw',
                height: '4cqw',
                paddingRight: '1.9cqw',
                fontSize: '1.7cqw',
                backgroundImage: "url('/assets/002/upperBlank_002.webp')",
                backgroundSize: '100% 100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                fontFamily: "'StardustS', 'Stardust', sans-serif",
                fontWeight: 'bold',
                color: '#000',
              }}
            >
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{gold.toLocaleString()}</span>
              <span style={{ marginLeft: '0.4cqw', fontSize: '1.4cqw' }}>G</span>
            </div>
          </div>
        </div>

        {/* 상단 3개 탭 */}
        <div className="gacha-tabs-container">
          <div className="gacha-tab-wrapper">
            <div
              className={`gacha-tab ${currentTab === 'flyer' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('flyer'); handleReturn(); }}
            >
              <div className="gacha-tab-inner" />
              <span>전단지 뽑기</span>
            </div>
          </div>
          <div className="gacha-tab-wrapper">
            <div
              className={`gacha-tab ${currentTab === 'fair' ? 'active' : ''} brightness-75`}
              onClick={() => { openComingSoonModal(); }}
            >
              <div className="gacha-tab-inner" />
              <span>박람회 뽑기</span>
            </div>
          </div>
          <div className="gacha-tab-wrapper">
            <div
              className={`gacha-tab ${currentTab === 'public' ? 'active' : ''} brightness-75`}
              onClick={() => { openComingSoonModal(); }}
            >
              <div className="gacha-tab-inner" />
              <span>공채 뽑기</span>
            </div>
          </div>
        </div>

        {/* 초기 화면 — 뽑기 버튼 */}
        <div className="gacha-main-area">
          {phase === 'select' && (
            <div className="gacha-bottom-area">
              <PullButtons />
            </div>
          )}
        </div>

        {/* ============================
            1회 뽑기 결과
            ============================ */}
        {phase === 'result_1' && drawnCards.length > 0 && (
          <div className="gacha-result-container" onClick={handleReturn}>
            <div className="gacha-single-result-center" onClick={(e) => e.stopPropagation()}>

              {/* 카드 플립 리빌 */}
              <div className="gacha-single-big-card">
                <GachaRevealCard
                  card={drawnCards[0]}
                  revealDelay={0}
                  statFontSize={21}
                />
              </div>

              {/* 뽑기 버튼 */}
              <div className="gacha-single-pull-buttons">
                <PullButtons />
              </div>
            </div>
          </div>
        )}

        {/* ============================
            10회 뽑기 결과 — 중앙 그리드
            ============================ */}
        {phase === 'result_10' && drawnCards.length > 0 && (
          <div className="gacha-result-container" onClick={handleReturn}>
            <div className="gacha-result-10-centered" onClick={(e) => e.stopPropagation()}>
              <div className="gacha-result-grid">
                {drawnCards.map((card, idx) => (
                  <div
                    key={idx}
                    className={`gacha-grid-card ${selectedCardIndex === idx ? 'selected' : ''}`}
                    data-grade={card.grade}
                    onClick={() => setSelectedCardIndex(selectedCardIndex === idx ? null : idx)}
                  >
                    <GachaRevealCard
                      card={card}
                      revealDelay={idx * 150}
                      statFontSize={12}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="gacha-bottom-buttons" onClick={(e) => e.stopPropagation()}>
              <PullButtons />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
