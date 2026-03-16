"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import "./card-list.css";

// --- 공용 JS 9-slice 컴포넌트 (Quest 페이지에서 재사용) ---
interface NineSliceBoxProps {
  src: string;
  slice: [number, number, number, number]; // [top, right, bottom, left]
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
          top: -(t - framePadding),
          right: -(r - framePadding),
          bottom: -(b - framePadding),
          left: -(l - framePadding),
          borderStyle: 'solid',
          borderWidth: `${t}px ${r}px ${b}px ${l}px`,
          borderImageSource: `url(${src})`,
          borderImageSlice: `${slice[0]} ${slice[1]} ${slice[2]} ${slice[3]} fill`,
          borderColor: 'transparent',
          imageRendering: 'pixelated',
          transform: 'translateZ(0) scale(1.0001)',
          backfaceVisibility: 'hidden',
          outline: 'none',
          zIndex: 0,
          pointerEvents: 'none'
        } as any}
      />
      <div className="nineslice-content" style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// --- 타입 정의 ---
type StatMap = { [key: string]: number };

interface Card {
  id: number;
  name: string;
  grade: 'S' | 'A' | 'B' | 'C';
  image: string;
  enhanceCount: number;
  maxEnhance: number;
  stats: StatMap;
  description: string;
  ability?: string;
  createdAt: number; // 최신순 정렬용 더미 타임스탬프
}

// --- 시드 기반 결정적 난수 생성 (SSR/CSR hydration 불일치 방지) ---
const seededRand = (seed: number): number => {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
};
const BASE_TIMESTAMP = 1700000000000; // 고정 타임스탬프

// --- 더미 데이터 리스트 ---
const generateDummyCards = (): Card[] => {
  const cards: Card[] = [];

  // 첫 번째 카드는 상세 스펙 지정 (황사장 S등급)
  cards.push({
    id: 1,
    name: "황사장",
    grade: "S",
    image: "/assets/008/SCardImage_000.png",
    enhanceCount: 7,
    maxEnhance: 7,
    stats: { "BE": 100, "AI": 100, "DevOps": 100 },
    description: "AI에도 미치시고 치킨에도 미치신 사장님입니다",
    ability: "능력 : 퀘스트 중인 팀원의 AI 능력치 +5% 강화",
    createdAt: BASE_TIMESTAMP,
  });

  const grades: ('S' | 'A' | 'B' | 'C')[] = ['S', 'A', 'B', 'C'];
  const statKeys = ["BE", "FE", "AI", "DBA", "DevOps", "Design"];

  for (let i = 1; i < 20; i++) {
    // SCardImage_000 ~ SCardImage_019 사용
    const imageNumber = i.toString().padStart(3, '0');
    const grade = grades[Math.floor(seededRand(i * 10) * grades.length)];
    const randomStatCnt = Math.floor(seededRand(i * 10 + 1) * 3) + 1;
    const stats: StatMap = {};
    for (let j = 0; j < randomStatCnt; j++) {
      const key = statKeys[Math.floor(seededRand(i * 10 + 2 + j) * statKeys.length)];
      stats[key] = Math.floor(seededRand(i * 10 + 5 + j) * 50) + 10;
    }

    cards.push({
      id: i + 1,
      name: `개발자 ${i}`,
      grade: grade,
      image: `/assets/008/SCardImage_${imageNumber}.png`,
      enhanceCount: Math.floor(seededRand(i * 10 + 8) * 5),
      maxEnhance: grade === 'S' ? 7 : (grade === 'A' ? 5 : 3),
      stats: stats,
      description: `열심히 코딩하는 개발자 ${i} 입니다.`,
      ability: grade === 'S' ? "능력 : 야근 시 체력 감소율 10% 감소" : undefined,
      createdAt: BASE_TIMESTAMP - Math.floor(seededRand(i * 10 + 9) * 10000000),
    });
  }

  // 데이터 부족하면 이미지를 재탕해서 채움 (총 24개 맞춤)
  for (let i = 20; i < 24; i++) {
    cards.push({
      ...cards[i - 20],
      id: i + 1,
      createdAt: BASE_TIMESTAMP - Math.floor(seededRand(i * 10 + 9) * 10000000),
    });
  }

  return cards;
};

const DUMMY_CARDS = generateDummyCards();

export default function CardListPage() {
  const [scale, setScale] = useState(1);
  const [selectedCardId, setSelectedCardId] = useState<number>(DUMMY_CARDS[0].id);

  // 필터 상태
  const [capacitySort, setCapacitySort] = useState("ALL");
  const [orderSort, setOrderSort] = useState("GRADE"); // GRADE(등급순), STAT(능력순), LATEST(최신순)

  // 윈도우 스케일링
  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / 1280;
      const scaleY = window.innerHeight / 720;
      setScale(Math.min(scaleX, scaleY));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 필터링 및 정렬 로직
  const filteredAndSortedCards = useMemo(() => {
    let result = [...DUMMY_CARDS];

    // 능력치(Capacity) 필터
    if (capacitySort !== "ALL") {
      result = result.filter(card => {
        // Dev 는 DevOps 로 매핑 등 조건 처리
        const searchKey = capacitySort === "Dev" ? "DevOps" : capacitySort;
        return card.stats[searchKey] !== undefined;
      });
    }

    // 정렬 (Order)
    result.sort((a, b) => {
      if (orderSort === "GRADE") {
        const gradeRank = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
        return gradeRank[b.grade] - gradeRank[a.grade];
      } else if (orderSort === "STAT") {
        const sumA = Object.values(a.stats).reduce((acc, val) => acc + val, 0);
        const sumB = Object.values(b.stats).reduce((acc, val) => acc + val, 0);
        return sumB - sumA;
      } else if (orderSort === "LATEST") {
        return b.createdAt - a.createdAt;
      }
      return 0;
    });

    return result;
  }, [capacitySort, orderSort]);

  // 스크롤 관련 상태
  const [scrollRatio, setScrollRatio] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartRatioRef = useRef(0);

  const ROW_HEIGHT = 210 + 12; // 3열 기준 카드 높이
  const VISIBLE_ROWS = 2.8;
  const totalRows = Math.ceil(filteredAndSortedCards.length / 3);
  const totalContentHeight = totalRows * ROW_HEIGHT + 32;
  const visibleHeight = VISIBLE_ROWS * ROW_HEIGHT;
  const maxScroll = Math.max(0, totalContentHeight - visibleHeight);
  const scrollOffset = scrollRatio * maxScroll;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (maxScroll <= 0) return;
    const delta = e.deltaY / maxScroll;
    setScrollRatio(prev => Math.min(1, Math.max(0, prev + delta * 0.3)));
  }, [maxScroll]);

  const getThumbTop = useCallback(() => {
    if (!trackHeight) return 0;
    const trackPadding = 14;
    const thumbSize = 24;
    const maxThumbTop = trackHeight - thumbSize - (trackPadding * 2);
    if (maxThumbTop <= 0) return trackPadding;
    return trackPadding + (scrollRatio * maxThumbTop);
  }, [scrollRatio, trackHeight]);

  useEffect(() => {
    if (trackRef.current) setTrackHeight(trackRef.current.clientHeight);
  }, [filteredAndSortedCards]);

  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartRatioRef.current = scrollRatio;
  }, [scrollRatio]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !trackRef.current) return;
      const trackHeightCurrent = trackRef.current.clientHeight;
      const trackPadding = 14;
      const thumbSize = 24;
      const maxThumbTop = trackHeightCurrent - thumbSize - (trackPadding * 2);
      if (maxThumbTop <= 0) return;
      const deltaY = e.clientY - dragStartYRef.current;
      const newRatio = Math.min(1, Math.max(0, dragStartRatioRef.current + deltaY / maxThumbTop));
      setScrollRatio(newRatio);
    };
    const handleMouseUp = () => { isDraggingRef.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeightCurrent = rect.height;
    const trackPadding = 14;
    const thumbSize = 24;
    const maxThumbTop = trackHeightCurrent - thumbSize - (trackPadding * 2);
    if (maxThumbTop <= 0) return;
    const adjustedClickY = clickY - trackPadding;
    const newRatio = Math.min(1, Math.max(0, (adjustedClickY - thumbSize / 2) / maxThumbTop));
    setScrollRatio(newRatio);
  }, []);

  const selectedCard = DUMMY_CARDS.find(c => c.id === selectedCardId) || DUMMY_CARDS[0];

  return (
    <div className="cardlist-page-wrapper">
      <div
        className="cardlist-page-container"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
      >
        {/* 상단 타이틀 */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <NineSliceBox
            src="/assets/008/questCard_000.png"
            slice={[200, 208, 200, 208]}
            framePadding={14}
            borderScale={0.4}
            className="cardlist-page-title-box"
          >
            <h1 className="cardlist-page-title">카드 목록 보기</h1>
          </NineSliceBox>
        </div>

        {/* 메인 콘텐츠 패딩 래퍼 */}
        <div className="cardlist-content-padding">

          {/* ──── 좌측: 필터 + 카드 그리드 ──── */}
          <div className="cardlist-left-col">
            {/* 정렬창 (상단) */}
            <div className="cardlist-filters">
              {/* 능력치 순 정렬 */}
              <div className="cardlist-select-wrapper">
                <select
                  className="cardlist-select"
                  value={capacitySort}
                  onChange={(e) => setCapacitySort(e.target.value)}
                >
                  <option value="ALL">ALL</option>
                  <option value="BE">BE</option>
                  <option value="FE">FE</option>
                  <option value="AI">AI</option>
                  <option value="DBA">DBA</option>
                  <option value="Dev">Dev</option>
                  <option value="Design">Design</option>
                </select>
              </div>

              {/* 속성 순 정렬 */}
              <div className="cardlist-select-wrapper">
                <select
                  className="cardlist-select"
                  value={orderSort}
                  onChange={(e) => setOrderSort(e.target.value)}
                >
                  <option value="GRADE">등급순</option>
                  <option value="STAT">능력순</option>
                  <option value="LATEST">최신순</option>
                </select>
              </div>
            </div>

            {/* 카드 리스트 박스 */}
            <NineSliceBox src="/assets/008/questInf_000.png" slice={[121, 248, 85, 248]} framePadding={24} borderScale={0.5} className="cardlist-left-box">
              <div className="cardlist-grid-wrapper" onWheel={handleWheel} style={{ height: visibleHeight }}>
                <div className="cardlist-grid" ref={gridRef} style={{ transform: `translateY(-${scrollOffset}px)` }}>
                  {filteredAndSortedCards.map(card => {
                    const isSelected = card.id === selectedCardId;
                    return (
                      <div
                        key={card.id}
                        className={`cardlist-card-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedCardId(card.id)}
                      >
                        <img src={card.image} alt={card.name} draggable={false} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </NineSliceBox>
          </div>

          {/* ──── 중앙: 스크롤바 ──── */}
          <div className="cardlist-scrollbar-column">
            <div ref={trackRef} className="scrollbar-track" onClick={handleTrackClick}>
              <div className="scrollbar-thumb" style={{ top: getThumbTop() }} onMouseDown={handleThumbMouseDown} />
            </div>
          </div>

          {/* ──── 우측: 상세 정보 패널 ──── */}
          <NineSliceBox
            src="/assets/008/questInf_000.png"
            slice={[121, 248, 85, 248]}
            framePadding={20}
            borderScale={0.5}
            className="cardlist-right-box"
          >
            <div className="cardlist-detail-split animate-detail" key={selectedCard.id}>
              {/* 아주 큰 카드 이미지 */}
              <div className="cardlist-big-card-col">
                <img src={selectedCard.image} alt="Selected Card Phase" draggable={false} />
              </div>

              {/* 우측 정보 뭉치 */}
              <div className="cardlist-info-col">
                {/* 이름 및 등급, 강화 횟수 */}
                <NineSliceBox src="/assets/008/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="cardlist-info-panel cardlist-info-header-box">
                  <div className="cardlist-info-header-text">
                    {selectedCard.name}({selectedCard.grade}등급) +{selectedCard.enhanceCount}
                  </div>
                </NineSliceBox>

                {/* 능력치 및 남은 강화 횟수 */}
                <NineSliceBox src="/assets/008/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="cardlist-info-panel cardlist-info-stats-box">
                  <div className="cardlist-info-title">능력치</div>
                  {Object.entries(selectedCard.stats).map(([key, val]) => (
                    <div key={key} className="cardlist-info-text">{key} +{val}</div>
                  ))}
                  <div className="cardlist-info-text" style={{ marginTop: '8px' }}>
                    남은 강화횟수 {selectedCard.maxEnhance - selectedCard.enhanceCount}
                  </div>
                </NineSliceBox>

                {/* 설명 및 S등급 특수 능력 */}
                <NineSliceBox src="/assets/008/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={18} borderScale={0.35} className="cardlist-info-panel cardlist-s-grade-desc" style={{ flex: 1, justifyContent: 'flex-start' }}>
                  <div className="cardlist-info-text" style={{ textAlign: 'left', marginBottom: '16px' }}>
                    {selectedCard.description}
                  </div>
                  {selectedCard.grade === 'S' && selectedCard.ability && (
                    <div className="cardlist-info-text" style={{ textAlign: 'left', color: '#111' }}>
                      {selectedCard.ability}
                    </div>
                  )}
                </NineSliceBox>
              </div>
            </div>
          </NineSliceBox>

        </div>
      </div>
    </div>
  );
}
