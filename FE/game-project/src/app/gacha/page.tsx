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
  const { openComingSoonModal } = useGameStore();
  const [drawnCards, setDrawnCards] = useState<GachaCard[]>([]);
  const [scale, setScale] = useState(1);

  // 창 크기에 맞춰 1280x720 화면 비율 유지
  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const widthScale = windowWidth / 1280;
      const heightScale = windowHeight / 720;
      setScale(Math.min(widthScale, heightScale));
    };

    handleResize(); // 초기화
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1회 뽑기
  const handlePull1 = () => {
    const randomCard = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
    setDrawnCards([randomCard]);
    setPhase('result_1');
  };

  // 10회 뽑기
  const handlePull10 = () => {
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
    <div className="gacha-page-wrapper">
      <div 
        className="gacha-page-container"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
      >
        <div className={`gacha-content gacha-bg-${currentTab}`}>
          
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
                      className="gacha-action-btn"
                      style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                      onClick={handlePull1}
                    >
                      <span>1회 뽑기</span>
                    </div>

                    <div 
                      className="gacha-action-btn btn-10pull"
                      style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                      onClick={handlePull10}
                    >
                      <span style={{ marginTop: '-4px' }}>10회 뽑기</span>
                      <span className="btn-subtitle">(할인해줌 ㅋ)</span>
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
                      className="gacha-action-btn"
                      style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                      onClick={handlePull1}
                    >
                      <span>1회 뽑기</span>
                    </div>

                    <div 
                      className="gacha-action-btn btn-10pull"
                      style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                      onClick={handlePull10}
                    >
                      <span>10회 뽑기</span>
                      <span className="btn-subtitle">(할인해줌 ㅋ)</span>
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
                      className="gacha-action-btn"
                      style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                      onClick={handlePull1}
                    >
                      <span>1회 뽑기</span>
                    </div>

                    <div 
                      className="gacha-action-btn btn-10pull"
                      style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
                      onClick={handlePull10}
                    >
                      <span>10회 뽑기</span>
                      <span className="btn-subtitle">(할인해줌 ㅋ)</span>
                    </div>
                  </div>
              </div>
          )}

        </div>
      </div>
    </div>
  );
}
