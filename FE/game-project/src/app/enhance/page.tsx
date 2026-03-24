"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import api from "@/lib/axios";
import { simulateEnhance, EnhanceResult, getEnhanceData } from "@/lib/enhanceLogic";
import { EnhanceAnimationOverlay } from "./EnhanceAnimationOverlay";
import "./enhance.css";

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// --- 공용 JS 9-slice 컴포넌트 ---
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

function displaySkillType(type: string): string {
  return type.toUpperCase() === 'DEVOPS' ? 'DEV' : type.toUpperCase();
}

// --- API 응답 타입 ---
interface CardSkill {
  skillType: string;
  value: number;
}

interface CardListItem {
  cardId: number;
  grade: string;
  name: string;
  imageUrl: string;
  skill1: CardSkill;
  skill2: CardSkill;
  skill3: CardSkill;
  specialAbility: { name: string; description: string; effects: string } | null;
}

interface CardDetailData {
  cardId: number;
  grade: string;
  name: string;
  stats: { [key: string]: number };
  enhanceLevel: number;
  enhanceTries?: number; // fallback for current non-existing API data
}

// --- 스킬 필터 옵션 ---
const SKILL_FILTERS = ["ALL", "BE", "FE", "AI", "DBA", "DEV", "DESIGN"] as const;

interface LocalEnhanceState {
  enhanceLevel: number;
  enhanceTries: number;
  addedStats: { skill1: number; skill2: number; skill3: number };
}

export default function EnhancePage() {
  const { getAccessToken } = usePrivy();
  const { accessToken, gold, increaseGold } = useGameStore();

  // --- 로컬 강화 상태 ---
  const [localEnhancements, setLocalEnhancements] = useState<Record<number, LocalEnhanceState>>({});
  const [enhanceResult, setEnhanceResult] = useState<(EnhanceResult & { previousStats: { skill1: number; skill2: number; skill3: number } }) | null>(null);

  // --- 애니메이션 상태 ---
  const [isAnimating, setIsAnimating] = useState(false);
  const [pendingResult, setPendingResult] = useState<(EnhanceResult & { previousStats: { skill1: number; skill2: number; skill3: number } }) | null>(null);

  // --- 카드 목록 상태 ---
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // --- 선택 / 상세 상태 ---
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CardDetailData | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // --- 필터 상태 ---
  const [capacitySort, setCapacitySort] = useState<string>("ALL");

  // --- 인증 토큰 ---
  const getAuthToken = useCallback(async () => {
    return accessToken || await getAccessToken();
  }, [accessToken, getAccessToken]);

  // --- 카드 목록 조회 (cursor pagination) ---
  const fetchCards = useCallback(async (cursor?: string | null, filterOverride?: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const currentFilter = filterOverride ?? capacitySort;
      const params: Record<string, string> = { limit: '30' };
      if (cursor) params.cursor = cursor;
      if (currentFilter && currentFilter !== 'ALL') {
        params.statType = currentFilter === 'DEV' ? 'DEVOPS' : currentFilter;
      }
      const { data: json } = await api.get('/api/v1/cards', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (json.success && json.data) {
        const newCards: CardListItem[] = json.data.cards;
        setCards(prev => cursor ? [...prev, ...newCards] : newCards);
        setNextCursor(json.data.nextCursor || null);
        setHasMore(json.data.hasMore);

        // 첫 로드 시 첫 번째 카드 자동 선택
        if (!cursor && newCards.length > 0) {
          setSelectedCardId(newCards[0].cardId);
          fetchCardDetail(newCards[0].cardId);
        }
      }
    } catch (err) {
      console.error("카드 목록 조회 실패:", err);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAuthToken, capacitySort]);

  // --- 카드 상세 조회 ---
  const fetchCardDetail = useCallback(async (cardId: number) => {
    setIsDetailLoading(true);
    try {
      const token = await getAuthToken();
      const { data: json } = await api.get(`/api/v1/cards/${cardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (json.success && json.data) {
        setSelectedDetail(json.data);
      }
    } catch (err) {
      console.error("카드 상세 조회 실패:", err);
    } finally {
      setIsDetailLoading(false);
    }
  }, [getAuthToken]);

  // --- 초기 로드 + 필터 변경 시 리셋 후 다시 fetch ---
  useEffect(() => {
    setCards([]);
    setNextCursor(null);
    setHasMore(true);
    setSelectedCardId(null);
    setSelectedDetail(null);
    setScrollRatio(0);
    setIsInitialLoad(true);
    fetchCards(null, capacitySort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacitySort]);

  // --- 카드 클릭 ---
  const handleCardClick = useCallback((cardId: number) => {
    setSelectedCardId(cardId);
    fetchCardDetail(cardId);
  }, [fetchCardDetail]);

  // --- 서버에서 정렬된 순서 그대로 사용 ---
  const sortedCards = cards;

  // --- 선택된 카드의 리스트 데이터 ---
  const selectedListCard = useMemo(() => {
    return cards.find(c => c.cardId === selectedCardId) || null;
  }, [cards, selectedCardId]);

  // --- 추가된 로컬 상탯값 계산 ---
  const currentEnhancement = selectedCardId ? localEnhancements[selectedCardId] : null;

  const displayEnhanceLevel = currentEnhancement ? currentEnhancement.enhanceLevel : (selectedDetail?.enhanceLevel || 0);
  const displayEnhanceTries = currentEnhancement ? currentEnhancement.enhanceTries : (selectedDetail?.enhanceTries || 0);

  const displaySkill1 = selectedListCard ? selectedListCard.skill1.value + (currentEnhancement?.addedStats.skill1 || 0) : 0;
  const displaySkill2 = selectedListCard ? selectedListCard.skill2.value + (currentEnhancement?.addedStats.skill2 || 0) : 0;
  const displaySkill3 = selectedListCard ? selectedListCard.skill3.value + (currentEnhancement?.addedStats.skill3 || 0) : 0;

  // --- 스크롤 관련 상태 ---
  const [scrollRatio, setScrollRatio] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const [wrapperHeight, setWrapperHeight] = useState(0);
  const [gridHeight, setGridHeight] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartRatioRef = useRef(0);
  // 스와이프 스크롤
  const swipeStartYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const swipeMovedRef = useRef(false);
  const swipeVelocityRef = useRef(0);
  const swipeLastTimeRef = useRef(0);
  const momentumAnimRef = useRef<number | null>(null);

  // 실제 DOM 높이 기반으로 계산 (하드코딩 제거)
  const maxScroll = Math.max(0, gridHeight - wrapperHeight);
  const scrollOffset = scrollRatio * maxScroll;

  // --- 스크롤 하단 도달 시 다음 페이지 로드 ---
  useEffect(() => {
    if (scrollRatio > 0.9 && hasMore && !isLoading && nextCursor) {
      fetchCards(nextCursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollRatio, hasMore, isLoading, nextCursor]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (maxScroll <= 0) return;
    const delta = e.deltaY / maxScroll;
    setScrollRatio(prev => Math.min(1, Math.max(0, prev + delta * 0.7)));
  }, [maxScroll]);

  const getThumbTop = useCallback(() => {
    if (!trackHeight) return 0;
    const trackPadding = 14;
    const thumbSize = 100;
    const maxThumbTop = trackHeight - thumbSize - (trackPadding * 2);
    if (maxThumbTop <= 0) return trackPadding;
    return trackPadding + (scrollRatio * maxThumbTop);
  }, [scrollRatio, trackHeight]);

  useEffect(() => {
    const measure = () => {
      if (trackRef.current) setTrackHeight(trackRef.current.clientHeight);
      if (wrapperRef.current) setWrapperHeight(wrapperRef.current.clientHeight);
      if (gridRef.current) setGridHeight(gridRef.current.scrollHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    const timer = setTimeout(measure, 100);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(timer);
    };
  }, [sortedCards]);

  const handleThumbPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartRatioRef.current = scrollRatio;
  }, [scrollRatio]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !trackRef.current) return;
      const trackHeightCurrent = trackRef.current.clientHeight;
      const trackPadding = 14;
      const thumbSize = 100;
      const maxThumbTop = trackHeightCurrent - thumbSize - (trackPadding * 2);
      if (maxThumbTop <= 0) return;
      const deltaY = e.clientY - dragStartYRef.current;
      const newRatio = Math.min(1, Math.max(0, dragStartRatioRef.current + deltaY / maxThumbTop));
      setScrollRatio(newRatio);
    };
    const handlePointerUp = () => { isDraggingRef.current = false; };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeightCurrent = rect.height;
    const trackPadding = 14;
    const thumbSize = 100;
    const maxThumbTop = trackHeightCurrent - thumbSize - (trackPadding * 2);
    if (maxThumbTop <= 0) return;
    const adjustedClickY = clickY - trackPadding;
    const newRatio = Math.min(1, Math.max(0, (adjustedClickY - thumbSize / 2) / maxThumbTop));
    setScrollRatio(newRatio);
  }, []);

  return (
    <div className="cardlist-page-container enhance-page">

      {/* 상단 타이틀 */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <NineSliceBox
          src={`${ASSET_BASE}/assets/008/questCard_000.webp`}
          slice={[200, 208, 200, 208]}
          framePadding={14}
          borderScale={0.4}
          className="cardlist-page-title-box"
        >
          <h1 className="cardlist-page-title">카드 강화</h1>
        </NineSliceBox>
      </div>

      {/* 메인 콘텐츠 패딩 래퍼 */}
      <div className="cardlist-content-padding">

        {/* ──── 좌측: 필터 + 카드 그리드 ──── */}
        <div className="cardlist-left-col">
          {/* 스킬 필터 드롭다운 */}
          <div className="cardlist-filters">
            <div className="cardlist-select-wrapper">
              <select
                className="cardlist-select"
                value={capacitySort}
                onChange={(e) => setCapacitySort(e.target.value)}
              >
                {SKILL_FILTERS.map(filter => (
                  <option key={filter} value={filter}>{filter}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 카드 리스트 박스 */}
          <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={24} borderScale={0.5} className="cardlist-left-box">
            <div
              className="cardlist-grid-wrapper"
              ref={wrapperRef}
              onWheel={handleWheel}
              style={{ flex: 1, overflow: 'hidden' }}
              onPointerDown={(e) => {
                if (maxScroll <= 0) return;
                if (momentumAnimRef.current !== null) { cancelAnimationFrame(momentumAnimRef.current); momentumAnimRef.current = null; }
                isSwipingRef.current = true;
                swipeMovedRef.current = false;
                swipeStartYRef.current = e.clientY;
                swipeVelocityRef.current = 0;
                swipeLastTimeRef.current = performance.now();
              }}
              onPointerMove={(e) => {
                if (!isSwipingRef.current || maxScroll <= 0) return;
                const now = performance.now();
                const dt = Math.max(8, now - swipeLastTimeRef.current);
                const gameScale = parseFloat(document.documentElement.style.getPropertyValue('--game-scale')) || 1;
                const rawDelta = swipeStartYRef.current - e.clientY;
                if (Math.abs(rawDelta) > 2) swipeMovedRef.current = true;
                swipeVelocityRef.current = rawDelta * (16 / dt);
                swipeStartYRef.current = e.clientY;
                swipeLastTimeRef.current = now;
                setScrollRatio(prev => Math.min(1, Math.max(0, prev + (rawDelta / gameScale) / maxScroll)));
              }}
              onPointerUp={() => {
                if (!isSwipingRef.current) return;
                isSwipingRef.current = false;
                const capturedMax = maxScroll;
                const gameScale = parseFloat(document.documentElement.style.getPropertyValue('--game-scale')) || 1;
                let v = swipeVelocityRef.current / gameScale;
                const animate = () => {
                  v *= 0.90;
                  if (Math.abs(v) < 0.3 || capturedMax <= 0) { momentumAnimRef.current = null; swipeMovedRef.current = false; return; }
                  setScrollRatio(prev => Math.min(1, Math.max(0, prev + v / capturedMax)));
                  momentumAnimRef.current = requestAnimationFrame(animate);
                };
                if (Math.abs(v) > 0.5) { momentumAnimRef.current = requestAnimationFrame(animate); } else { swipeMovedRef.current = false; }
              }}
              onPointerCancel={() => {
                isSwipingRef.current = false;
                swipeMovedRef.current = false;
                if (momentumAnimRef.current !== null) { cancelAnimationFrame(momentumAnimRef.current); momentumAnimRef.current = null; }
              }}
              onClickCapture={(e) => { if (swipeMovedRef.current) { e.stopPropagation(); swipeMovedRef.current = false; } }}
            >
              <div className="cardlist-grid" ref={gridRef} style={{ transform: `translateY(-${scrollOffset}px)` }}>
                {isInitialLoad ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#8a8ab0', fontFamily: "'StardustS', 'Stardust', sans-serif", fontSize: 16 }}>
                    로딩 중...
                  </div>
                ) : sortedCards.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#8a8ab0', fontFamily: "'StardustS', 'Stardust', sans-serif", fontSize: 16 }}>
                    카드가 없습니다
                  </div>
                ) : (
                  sortedCards.map(card => {
                    const isSelected = card.cardId === selectedCardId;
                    return (
                      <div
                        key={card.cardId}
                        className={`cardlist-card-item ${isSelected ? 'selected' : ''}`}
                        data-grade={card.grade}
                        onClick={() => handleCardClick(card.cardId)}
                      >
                        <img src={card.imageUrl} alt={card.name} draggable={false} loading="lazy" decoding="async" />
                        <span className="cardlist-card-stat stat-1">{displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                        <span className="cardlist-card-stat stat-2">{displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                        <span className="cardlist-card-stat stat-3">{displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
                      </div>
                    );
                  })
                )}
                {isLoading && !isInitialLoad && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 20, color: '#8a8ab0', fontFamily: "'StardustS', 'Stardust', sans-serif", fontSize: 14 }}>
                    더 불러오는 중...
                  </div>
                )}
              </div>
            </div>
          </NineSliceBox>
        </div>

        {/* ──── 중앙: 스크롤바 ──── */}
        <div className="cardlist-scrollbar-column">
          <div ref={trackRef} className="scrollbar-track" onClick={handleTrackClick}>
            <div className="scrollbar-thumb" style={{ top: getThumbTop() }} onPointerDown={handleThumbPointerDown} />
          </div>
        </div>

        {/* ──── 우측: 상세 정보 패널 ──── */}
        <NineSliceBox
          src={`${ASSET_BASE}/assets/008/questInf_000.webp`}
          slice={[121, 248, 85, 248]}
          framePadding={20}
          borderScale={0.5}
          className="cardlist-right-box"
        >
          {/* 재화 정보 표시 */}
          <div className="enhance-currency-info-wrapper">
            <div className="currency-info-container">
              <div className="currency-info-blank">
                <span className="tabular-nums">{gold.toLocaleString()}</span>
                <span className="currency-unit">G</span>
              </div>
              <img src={`${ASSET_BASE}/assets/002/coin_002.webp`} alt="gold" className="currency-icon" />
            </div>
          </div>

          {selectedListCard ? (
            <div className="cardlist-detail-split animate-detail" key={selectedListCard.cardId}>
              {/* 큰 카드 이미지 */}
              <div className="cardlist-big-card-col">
                <div className="cardlist-big-card-wrapper">
                  <img src={selectedListCard.imageUrl} alt={selectedListCard.name} draggable={false} />
                  <span className="cardlist-big-card-stat stat-1">{displaySkillType(selectedListCard.skill1.skillType)} {selectedListCard.skill1.value}</span>
                  <span className="cardlist-big-card-stat stat-2">{displaySkillType(selectedListCard.skill2.skillType)} {selectedListCard.skill2.value}</span>
                  <span className="cardlist-big-card-stat stat-3">{displaySkillType(selectedListCard.skill3.skillType)} {selectedListCard.skill3.value}</span>
                </div>
              </div>

              {/* 우측 정보 */}
              <div className="cardlist-info-col">
                {!enhanceResult ? (
                  <>
                    {/* 1. 이름 + 등급 + 강화 레벨 */}
                    <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="cardlist-info-panel cardlist-info-header-box">
                      <div className="cardlist-info-header-text">
                        {selectedListCard.name}({selectedListCard.grade}등급)
                        {displayEnhanceLevel ? ` +${displayEnhanceLevel}` : ''}
                      </div>
                    </NineSliceBox>

                    {/* 2. 능력치 및 남은 강화 횟수 */}
                    <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="cardlist-info-panel cardlist-info-stats-box">
                      <div className="cardlist-info-title" style={{ marginBottom: '8px' }}>능력치</div>
                      <div className="cardlist-info-text">{displaySkillType(selectedListCard.skill1.skillType)} +{displaySkill1}</div>
                      <div className="cardlist-info-text">{displaySkillType(selectedListCard.skill2.skillType)} +{displaySkill2}</div>
                      <div className="cardlist-info-text">{displaySkillType(selectedListCard.skill3.skillType)} +{displaySkill3}</div>
                      <div className="cardlist-info-text" style={{ marginTop: '8px', color: '#111' }}>
                        남은 강화횟수 : {Math.max(0, 7 - displayEnhanceTries)}
                      </div>
                    </NineSliceBox>

                    {/* 3. 강화 상수 정보 */}
                    <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="cardlist-info-panel enhance-info-box">
                      <div className="cardlist-info-text">강화 성공 확률 : {getEnhanceData(selectedListCard.grade).prob}%</div>
                      <div className="cardlist-info-text">강화 비용 : {getEnhanceData(selectedListCard.grade).cost.toLocaleString()}G</div>
                      <div className="cardlist-info-text">성공 시 능력치 분배량 : +{getEnhanceData(selectedListCard.grade).statIncrease}</div>
                    </NineSliceBox>

                    {/* 4. 강화 버튼 */}
                    <button
                      className="enhance-action-btn"
                      // TODO: 테스트 모드 — 골드 부족해도 강화 가능 (BE 연동 시 골드 체크 복원)
                      disabled={displayEnhanceTries >= 7}
                      onClick={() => {
                        const result = simulateEnhance(selectedListCard.grade, displayEnhanceTries, gold);
                        if (result.error === 'MAX_TRIES') {
                          alert('강화 횟수를 초과했습니다.');
                          return;
                        }

                        increaseGold(-result.cost);

                        setPendingResult({
                          ...result,
                          previousStats: {
                            skill1: displaySkill1,
                            skill2: displaySkill2,
                            skill3: displaySkill3,
                          }
                        });
                        setIsAnimating(true);
                      }}
                    >
                      강화하기
                    </button>
                  </>
                ) : (
                  <NineSliceBox 
                    src={`${ASSET_BASE}/assets/008/questInf_001.webp`} 
                    slice={[108, 260, 129, 340]} 
                    framePadding={20} 
                    borderScale={0.35} 
                    className="cardlist-info-panel enhance-result-panel fade-in-up"
                    style={{ flex: 1 }}
                  >
                    <div className="enhance-modal-title" style={{ fontSize: '28px', marginBottom: '20px', color: enhanceResult.success ? '#222' : '#888' }}>
                      강화 {enhanceResult.success ? '성공!' : '실패'}
                    </div>

                    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      {enhanceResult.success && enhanceResult.statsAdded && (
                        <div className="enhance-modal-content" style={{ textAlign: 'center' }}>
                          <div className="enhance-modal-text" style={{ marginBottom: 8 }}>
                            {displaySkillType(selectedListCard.skill1.skillType)} {enhanceResult.previousStats.skill1} &rarr; {enhanceResult.previousStats.skill1 + enhanceResult.statsAdded.skill1} <span style={{color: '#4caf50', fontWeight: 'bold'}}>(+{enhanceResult.statsAdded.skill1})</span>
                          </div>
                          <div className="enhance-modal-text" style={{ marginBottom: 8 }}>
                            {displaySkillType(selectedListCard.skill2.skillType)} {enhanceResult.previousStats.skill2} &rarr; {enhanceResult.previousStats.skill2 + enhanceResult.statsAdded.skill2} <span style={{color: '#4caf50', fontWeight: 'bold'}}>(+{enhanceResult.statsAdded.skill2})</span>
                          </div>
                          <div className="enhance-modal-text" style={{ marginBottom: 8 }}>
                            {displaySkillType(selectedListCard.skill3.skillType)} {enhanceResult.previousStats.skill3} &rarr; {enhanceResult.previousStats.skill3 + enhanceResult.statsAdded.skill3} <span style={{color: '#4caf50', fontWeight: 'bold'}}>(+{enhanceResult.statsAdded.skill3})</span>
                          </div>
                        </div>
                      )}
                      
                      {!enhanceResult.success && (
                        <div className="enhance-modal-content" style={{ textAlign: 'center', marginTop: 10 }}>
                          <div className="enhance-modal-text" style={{ color: '#ff6b6b', fontSize: '18px' }}>(스탯 변화 없음)</div>
                        </div>
                      )}
                      
                      <div className="enhance-modal-tries" style={{ marginTop: 20, marginBottom: 20, fontSize: '16px', color: '#111' }}>
                        남은 강화횟수 : {Math.max(0, 7 - (displayEnhanceTries))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: 'auto' }}>
                      <button 
                        className="enhance-action-btn"
                        style={{ marginTop: 0 }}
                        // TODO: 테스트 모드 — 골드 부족해도 강화 가능 (BE 연동 시 골드 체크 복원)
                        disabled={displayEnhanceTries >= 7}
                        onClick={() => {
                          setEnhanceResult(null);

                          const result = simulateEnhance(selectedListCard.grade, displayEnhanceTries, gold);
                          if (result.error === 'MAX_TRIES') {
                            alert('강화 횟수를 초과했습니다.');
                            return;
                          }

                          increaseGold(-result.cost);

                          setPendingResult({
                            ...result,
                            previousStats: {
                              skill1: displaySkill1,
                              skill2: displaySkill2,
                              skill3: displaySkill3,
                            }
                          });
                          setIsAnimating(true);
                        }}
                      >
                        연속 강화
                      </button>
                      <button 
                        className="enhance-action-btn"
                        style={{ background: '#7a7a7a', borderColor: '#4d4d4d', marginTop: 0 }}
                        onClick={() => setEnhanceResult(null)}
                      >
                        확인
                      </button>
                    </div>
                  </NineSliceBox>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8ab0', fontFamily: "'StardustS', 'Stardust', sans-serif", fontSize: 18 }}>
              {isInitialLoad ? "로딩 중..." : "카드를 선택해주세요"}
            </div>
          )}
        </NineSliceBox>

      </div>

      {/* Phaser 애미메이션 렌더링 컨테이너 */}
      {isAnimating && pendingResult && selectedListCard && (
        <EnhanceAnimationOverlay
          card={selectedListCard}
          isSuccess={pendingResult.success}
          onShowResult={() => {
            // 애니메이션 진행 중(3.5초 지점) 카드 왼쪽 슬라이드와 함께 실제 상태 반영 & 결과 모달 표출
            let newLevel = displayEnhanceLevel;
            const prevAddedStats = currentEnhancement?.addedStats || { skill1: 0, skill2: 0, skill3: 0 };
            const newAddedStats = { ...prevAddedStats };

            if (pendingResult.success && pendingResult.statsAdded) {
              newLevel += 1;
              newAddedStats.skill1 += pendingResult.statsAdded.skill1;
              newAddedStats.skill2 += pendingResult.statsAdded.skill2;
              newAddedStats.skill3 += pendingResult.statsAdded.skill3;
            }

            setLocalEnhancements(prev => ({
              ...prev,
              [selectedListCard.cardId]: {
                enhanceLevel: newLevel,
                enhanceTries: displayEnhanceTries + 1,
                addedStats: newAddedStats,
              }
            }));

            // 결과 모달 띄우기 (컴포넌트 마운트 및 CSS fade-in)
            setEnhanceResult(pendingResult);
          }}
          onComplete={() => {
            // 모든 연출 완전 종료 시 (4.5초) Phaser 컨테이너만 언마운트
            setIsAnimating(false);
            setPendingResult(null);
          }}
        />
      )}
    </div>
  );
}
