"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import "./gacha.css";

// --- NineSliceBox Component (from quest page) ---
interface NineSliceBoxProps {
  src: string;
  slice: [number, number, number, number];
  framePadding: number;
  borderScale?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

function NineSliceBox({ src, slice, framePadding, borderScale = 1, children, className, style, onClick }: NineSliceBoxProps) {
  const t = Math.round(slice[0] * borderScale);
  const r = Math.round(slice[1] * borderScale);
  const b = Math.round(slice[2] * borderScale);
  const l = Math.round(slice[3] * borderScale);

  return (
    <div
      className={`relative ${className || ''}`}
      style={{ padding: `${framePadding}px`, boxSizing: 'border-box', ...style }}
      onClick={onClick}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderStyle: 'solid',
          borderWidth: `${t}px ${r}px ${b}px ${l}px`,
          borderImageSource: `url(${src})`,
          borderImageSlice: `${slice[0]} ${slice[1]} ${slice[2]} ${slice[3]} fill`,
          borderImageRepeat: 'stretch',
          imageRendering: 'pixelated',
          transform: 'translateZ(0) scale(1.0001)', // 미세한 오버슈트로 틈새(seam) 제거
          backfaceVisibility: 'hidden',
          clipPath: 'inset(0)', // 오버슈트된 외곽선 잘라내기
          zIndex: 0,
          pointerEvents: 'none'
        } as React.CSSProperties}
      />
      <div className="nineslice-content" style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// --- Types & Dummy Data ---
type TabType = 'flyer' | 'fair' | 'public';
type PhaseType = 'select' | 'result_1' | 'result_10';

// 탭별 뽑기 비용
const GACHA_COSTS: Record<TabType, { single: number; ten: number }> = {
  flyer: { single: 10000, ten: 90000 },
  fair: { single: 15000, ten: 135000 },
  public: { single: 40000, ten: 360000 },
};

interface GachaCard {
  id: number;
  image: string;
}

// SCardImage_000.png ~ SCardImage_019.png
const CARD_POOL: GachaCard[] = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  image: `/assets/006/SCardImage_${i.toString().padStart(3, '0')}.png`
}));

export default function GachaPage() {
  const [currentTab, setCurrentTab] = useState<TabType>('flyer');
  const [phase, setPhase] = useState<PhaseType>('select');
  const { gold, increaseGold, openComingSoonModal } = useGameStore();
  const [drawnCards, setDrawnCards] = useState<GachaCard[]>([]);

  const canPull1 = gold >= GACHA_COSTS[currentTab].single;
  const canPull10 = gold >= GACHA_COSTS[currentTab].ten;


  // 1회 뽑기
  const handlePull1 = () => {
    const cost = GACHA_COSTS[currentTab].single;
    if (gold < cost) return;
    increaseGold(-cost);
    const randomCard = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
    setDrawnCards([randomCard]);
    setPhase('result_1');
  };

  // 10회 뽑기
  const handlePull10 = () => {
    const cost = GACHA_COSTS[currentTab].ten;
    if (gold < cost) return;
    increaseGold(-cost);
    const pulled = [];
    for (let i = 0; i < 10; i++) {
      pulled.push(CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)]);
    }
    setDrawnCards(pulled);
    setPhase('result_10');
  };

  const handleReturn = () => {
    setDrawnCards([]);
    setPhase('select');
  };

  return (
    <div className="gacha-page-container">
      <div className={`gacha-content gacha-bg-${currentTab}`}>

        {/* 좌측 상단 골드 HUD */}
        <div className="gacha-gold-hud">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '4.7cqw', width: '17.5cqw' }}>
            <div
              style={{
                position: 'absolute',
                right: 0, top: 0, bottom: 0,
                left: '2.5cqw',
                paddingRight: '1.9cqw',
                fontSize: '1.7cqw',
                backgroundImage: "url('/assets/002/upperBlank_002.png')",
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
            <img
              src="/assets/002/coin_002.png"
              alt="gold"
              style={{
                position: 'absolute',
                zIndex: 10,
                left: '-1.9cqw',
                top: '0.3cqw',
                width: '5cqw',
                height: '5cqw',
                imageRendering: 'pixelated',
              }}
            />
          </div>
        </div>

        {/* 상단 3개 탭 (각 1/3) */}
        <div className="gacha-tabs-container">
          <div className="gacha-tab-wrapper">
            <div
              className={`gacha-tab ${currentTab === 'flyer' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('flyer'); setPhase('select'); }}
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

        {/* 상시 표시되는 하단 우측 뽑기 버튼 (결과창 전 초기상태) */}
        <div className="gacha-main-area">
          {phase === 'select' && (
            <div className="gacha-bottom-area">
              <div
                className={`gacha-action-btn${!canPull1 ? ' btn-disabled' : ''}`}
                style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                onClick={canPull1 ? handlePull1 : undefined}
              >
                <span>1회 뽑기</span>
                <span className="btn-subtitle">({GACHA_COSTS[currentTab].single.toLocaleString()}G)</span>
              </div>

              <div
                className={`gacha-action-btn btn-10pull${!canPull10 ? ' btn-disabled' : ''}`}
                style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                onClick={canPull10 ? handlePull10 : undefined}
              >
                <span>10회 뽑기</span>
                <span className="btn-subtitle">({GACHA_COSTS[currentTab].ten.toLocaleString()}G)</span>
              </div>
            </div>
          )}
        </div>

        {/* --- 결과창 연출 --- */}
        {phase === 'result_1' && (
          <div className="gacha-result-container" onClick={handleReturn}>
            <div className="gacha-1pull-card" onClick={(e) => e.stopPropagation()}>
              <img src={drawnCards[0]?.image} alt="Drawn Card" />
            </div>

            <div className="gacha-bottom-buttons" onClick={(e) => e.stopPropagation()}>
              <div
                className={`gacha-action-btn${!canPull1 ? ' btn-disabled' : ''}`}
                style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                onClick={canPull1 ? handlePull1 : undefined}
              >
                <span>1회 뽑기</span>
                <span className="btn-subtitle">({GACHA_COSTS[currentTab].single.toLocaleString()}G)</span>
              </div>

              <div
                className={`gacha-action-btn btn-10pull${!canPull10 ? ' btn-disabled' : ''}`}
                style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                onClick={canPull10 ? handlePull10 : undefined}
              >
                <span>10회 뽑기</span>
                <span className="btn-subtitle">({GACHA_COSTS[currentTab].ten.toLocaleString()}G)</span>
              </div>
            </div>
          </div>
        )}

        {phase === 'result_10' && (
          <div className="gacha-result-container" onClick={handleReturn}>
            <div className="gacha-10pull-grid" onClick={(e) => e.stopPropagation()}>
              {drawnCards.map((card, idx) => (
                <div key={idx} className="gacha-10pull-card">
                  <img src={card.image} alt={`Drawn Card ${idx + 1}`} />
                </div>
              ))}
            </div>

            <div className="gacha-bottom-buttons" onClick={(e) => e.stopPropagation()}>
              <div
                className={`gacha-action-btn${!canPull1 ? ' btn-disabled' : ''}`}
                style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                onClick={canPull1 ? handlePull1 : undefined}
              >
                <span>1회 뽑기</span>
                <span className="btn-subtitle">({GACHA_COSTS[currentTab].single.toLocaleString()}G)</span>
              </div>

              <div
                className={`gacha-action-btn btn-10pull${!canPull10 ? ' btn-disabled' : ''}`}
                style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                onClick={canPull10 ? handlePull10 : undefined}
              >
                <span>10회 뽑기</span>
                <span className="btn-subtitle">({GACHA_COSTS[currentTab].ten.toLocaleString()}G)</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
