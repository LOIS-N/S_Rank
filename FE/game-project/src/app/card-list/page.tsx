"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUserStore } from "@/store/useUserStore";
import api from "@/lib/axios";
import "./card-list.css";

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// --- 공용 JS 9-slice 컴포넌트 --- 빠이빠이
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
  enhanceTryCount: number;
  enhanceSuccessCount: number;
  specialAbility: { name: string; description: string; effects: string } | null;
}

// --- 스킬 필터 옵션 ---
const SKILL_FILTERS = ["ALL", "BE", "FE", "AI", "DBA", "DEV", "DESIGN"] as const;

function normalizeSkillType(type: string): string {
  const upper = type.toUpperCase();
  return upper === 'DEV' || upper === 'DEVOPS' ? 'DEVOPS' : upper;
}

function getSkillIcon(type: string): string {
  const norm = normalizeSkillType(type).toLowerCase();
  return `${ASSET_BASE}/assets/003-01/${norm}.webp`;
}

const SKILL_ICON_STYLE: React.CSSProperties = { height: '1em', width: 'auto', verticalAlign: 'middle', imageRendering: 'pixelated', display: 'inline-block' };
const SKILL_ICON_DETAIL_STYLE: React.CSSProperties = { height: '0.8em', width: 'auto', verticalAlign: 'middle', position: 'relative', top: '-5px', imageRendering: 'pixelated', display: 'inline-block' };

function getCardStatForType(card: CardListItem, type: string): number {
  const norm = normalizeSkillType(type);
  let total = 0;
  if (normalizeSkillType(card.skill1.skillType) === norm) total += card.skill1.value;
  if (normalizeSkillType(card.skill2.skillType) === norm) total += card.skill2.value;
  if (normalizeSkillType(card.skill3.skillType) === norm) total += card.skill3.value;
  return total;
}

// filter='ALL' → 총합 기준, filter=스킬 → 해당 스킬 스탯 기준 정렬
function sortCards(cards: CardListItem[], filter: string, order: 'desc' | 'asc'): CardListItem[] {
  return [...cards].sort((a, b) => {
    const valA = filter === 'ALL'
      ? a.skill1.value + a.skill2.value + a.skill3.value
      : getCardStatForType(a, filter);
    const valB = filter === 'ALL'
      ? b.skill1.value + b.skill2.value + b.skill3.value
      : getCardStatForType(b, filter);
    return order === 'desc' ? valB - valA : valA - valB;
  });
}

export default function CardListPage() {
  const { getAccessToken } = usePrivy();


  // --- 카드 목록 상태 ---
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCnt, setTotalCnt] = useState<number | null>(null);

  // --- 선택 / 상세 상태 ---
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [usedCardIds, setUsedCardIds] = useState<number[]>([]);

  // --- 다중 해고 모드 ---
  const [isFireMode, setIsFireMode] = useState(false);
  const [fireSelectedIds, setFireSelectedIds] = useState<Set<number>>(new Set());
  const [confirmBulkFire, setConfirmBulkFire] = useState(false);

  // --- 필터 상태 ---
  const [capacitySort, setCapacitySort] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // --- 인증 토큰 ---
  const getAuthToken = useCallback(async () => {
    // useUserStore.accessToken이 로그인 시 설정되는 실제 토큰
    return useUserStore.getState().accessToken || await getAccessToken();
  }, [getAccessToken]);

  // --- 퀘스트 사용 중인 카드 조회 ---
  useEffect(() => {
    const fetchUsedCards = async () => {
      try {
        const token = await getAuthToken();
        const { data: json } = await api.get('/api/v1/cards/used', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (json.success && Array.isArray(json.data)) {
          setUsedCardIds(json.data);
        }
      } catch (err) {
        console.error('사용 중인 카드 조회 실패:', err);
      }
    };
    fetchUsedCards();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 카드 목록 조회 (cursor pagination) ---
  const fetchCards = useCallback(async (cursor?: string | null, filterOverride?: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const currentFilter = filterOverride ?? capacitySort;
      const params: Record<string, string> = { limit: '200' };
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
        if (json.data.totalCnt !== undefined) setTotalCnt(json.data.totalCnt);

        // 첫 로드 시 첫 번째 카드 자동 선택
        if (!cursor && newCards.length > 0) {
          setSelectedCardId(newCards[0].cardId);
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

  // --- 초기 로드 + 필터 변경 시 리셋 후 다시 fetch ---
  useEffect(() => {
    setCards([]);
    setNextCursor(null);
    setHasMore(true);
    setSelectedCardId(null);
    setScrollRatio(0);
    setIsInitialLoad(true);
    fetchCards(null, capacitySort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacitySort]);

  // --- 카드 클릭 ---
  const handleCardClick = useCallback((cardId: number) => {
    if (isFireMode) {
      if (usedCardIds.includes(cardId)) return; // 퀘스트 진행 중 카드는 선택 불가
      setFireSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(cardId)) next.delete(cardId);
        else next.add(cardId);
        return next;
      });
    } else {
      setSelectedCardId(cardId);
    }
  }, [isFireMode, usedCardIds]);

  // --- 해고 모드 진입 / 취소 ---
  const enterFireMode = useCallback(() => {
    setIsFireMode(true);
    setSelectedCardId(null);
    setFireSelectedIds(new Set());
    setConfirmBulkFire(false);
  }, []);

  const exitFireMode = useCallback(() => {
    setIsFireMode(false);
    setFireSelectedIds(new Set());
    setConfirmBulkFire(false);
  }, []);

  // --- 카드 일괄 해고 ---
  const handleBulkFire = useCallback(async () => {
    if (fireSelectedIds.size === 0 || isDeleting) return;
    setIsDeleting(true);
    try {
      const token = await getAuthToken();
      const ids = Array.from(fireSelectedIds);
      await api.delete('/api/v1/cards', {
        data: { cards: ids },
        headers: { Authorization: `Bearer ${token}` },
      });
      setCards(prev => prev.filter(c => !fireSelectedIds.has(c.cardId)));
      setTotalCnt(prev => prev !== null ? prev - ids.length : null);
      setFireSelectedIds(new Set());
      setConfirmBulkFire(false);
      setIsFireMode(false);
    } catch (err) {
      console.error('카드 일괄 삭제 실패:', err);
    } finally {
      setIsDeleting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fireSelectedIds, isDeleting, getAuthToken]);

  // --- 선택된 필터 스탯 기준 오름/내림차순 정렬 ---
  const sortedCards = useMemo(() => sortCards(cards, capacitySort, sortOrder), [cards, capacitySort, sortOrder]);

  // --- 선택된 카드의 리스트 데이터 ---
  const selectedListCard = useMemo(() => {
    return cards.find(c => c.cardId === selectedCardId) || null;
  }, [cards, selectedCardId]);

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
  const pendingScrollPxRef = useRef<number | null>(null);

  // 실제 DOM 높이 기반으로 계산 (하드코딩 제거)
  const maxScroll = Math.max(0, gridHeight - wrapperHeight);
  const scrollOffset = scrollRatio * maxScroll;

  // --- 스크롤 하단 도달 시 다음 페이지 로드 ---
  useEffect(() => {
    if (scrollRatio > 0.9 && hasMore && !isLoading && nextCursor) {
      pendingScrollPxRef.current = scrollRatio * maxScroll;
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
      const newWrapperH = wrapperRef.current?.clientHeight ?? 0;
      if (wrapperRef.current) setWrapperHeight(newWrapperH);
      const newGridH = gridRef.current?.scrollHeight ?? 0;
      if (gridRef.current) {
        setGridHeight(newGridH);
        if (pendingScrollPxRef.current !== null) {
          const newMaxScroll = Math.max(0, newGridH - newWrapperH);
          if (newMaxScroll > 0) setScrollRatio(Math.min(1, pendingScrollPxRef.current / newMaxScroll));
          pendingScrollPxRef.current = null;
        }
      }
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
    <div className="cardlist-page-container">

      {/* 상단 타이틀 */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <NineSliceBox
          src={`${ASSET_BASE}/assets/008/questCard_000.webp`}
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
          {/* 스킬 필터 드롭다운 + 정렬 버튼 */}
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
            <button
              className={`cardlist-filter-btn${sortOrder === 'desc' ? ' active' : ''}`}
              onClick={() => setSortOrder('desc')}
              title="높은 순"
            >▼ 높은 순</button>
            <button
              className={`cardlist-filter-btn${sortOrder === 'asc' ? ' active' : ''}`}
              onClick={() => setSortOrder('asc')}
              title="낮은 순"
            >▲ 낮은 순</button>
            {totalCnt !== null && (
              <span className="cardlist-total-cnt">{totalCnt} / 200</span>
            )}
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
                    const isSelected = !isFireMode && card.cardId === selectedCardId;
                    const isFireSelected = isFireMode && fireSelectedIds.has(card.cardId);
                    const isUsedInQuest = usedCardIds.includes(card.cardId);
                    return (
                      <div
                        key={card.cardId}
                        className={`cardlist-card-item ${isSelected ? 'selected' : ''} ${isFireSelected ? 'fire-selected' : ''} ${isFireMode && isUsedInQuest ? 'fire-disabled' : ''}`}
                        data-grade={card.grade}
                        onClick={() => handleCardClick(card.cardId)}
                      >
                        <img src={card.imageUrl} alt={card.name} draggable={false} loading="lazy" decoding="async" />
                        {card.enhanceSuccessCount > 0 && (
                          <span className="card-enhance-badge" data-level={String(card.enhanceSuccessCount)} data-grade={card.grade}>
                            <span className="badge-plus">+</span><span className="badge-num">{card.enhanceSuccessCount}</span>
                          </span>
                        )}
                        {isSelected && <span className="card-check-overlay">✓</span>}
                        {isFireMode && (
                          <span className={`fire-check-overlay${isFireSelected ? ' checked' : ''}${isUsedInQuest ? ' disabled' : ''}`}>
                            {isUsedInQuest ? '🔒' : isFireSelected ? '✓' : ''}
                          </span>
                        )}
                        <span className="cardlist-card-stat stat-1"><img src={getSkillIcon(card.skill1.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                        <span className="cardlist-card-stat stat-2"><img src={getSkillIcon(card.skill2.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                        <span className="cardlist-card-stat stat-3"><img src={getSkillIcon(card.skill3.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
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
          {isFireMode ? (
            <div className="cardlist-fire-mode-panel">
              <div className="fire-mode-title">해고 모드</div>
              <div className="fire-mode-hint">카드를 탭하여 선택하세요<br/>퀘스트 진행 중인 카드는 선택 불가</div>
              <div className={`fire-mode-count${fireSelectedIds.size > 0 ? ' has-selection' : ''}`}>
                {fireSelectedIds.size}장 선택됨
              </div>
              {confirmBulkFire ? (
                <div className="fire-mode-confirm">
                  <div className="fire-mode-confirm-text">정말 {fireSelectedIds.size}장을<br/>해고하시겠습니까?</div>
                  <div className="fire-mode-confirm-btns">
                    <button className="cardlist-fire-confirm-yes" onClick={handleBulkFire} disabled={isDeleting}>
                      {isDeleting ? '처리 중...' : '확인'}
                    </button>
                    <button className="cardlist-fire-confirm-no" onClick={() => setConfirmBulkFire(false)} disabled={isDeleting}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="fire-mode-btns">
                  <button
                    className={`cardlist-fire-btn${fireSelectedIds.size === 0 ? ' fire-confirm-disabled' : ''}`}
                    onClick={() => setConfirmBulkFire(true)}
                    disabled={fireSelectedIds.size === 0}
                  >
                    해고 확정 ({fireSelectedIds.size})
                  </button>
                  <button className="cardlist-cancel-btn" onClick={exitFireMode}>
                    취소
                  </button>
                </div>
              )}
            </div>
          ) : selectedListCard ? (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            <div className="cardlist-detail-split animate-detail" key={selectedListCard.cardId} style={{ flex: 1, minHeight: 0 }}>
              {/* 큰 카드 이미지 */}
              <div className="cardlist-big-card-col">
                <div className="cardlist-big-card-wrapper">
                  <img src={selectedListCard.imageUrl} alt={selectedListCard.name} draggable={false} />
                  <span className="cardlist-big-card-stat stat-1"><img src={getSkillIcon(selectedListCard.skill1.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill1.skillType)} {selectedListCard.skill1.value}</span>
                  <span className="cardlist-big-card-stat stat-2"><img src={getSkillIcon(selectedListCard.skill2.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill2.skillType)} {selectedListCard.skill2.value}</span>
                  <span className="cardlist-big-card-stat stat-3"><img src={getSkillIcon(selectedListCard.skill3.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill3.skillType)} {selectedListCard.skill3.value}</span>
                </div>
              </div>

              {/* 우측 정보 */}
              <div className="cardlist-info-col">
                {/* 이름 + 등급 + 강화 */}
                <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="cardlist-info-panel cardlist-info-header-box">
                  <div className="cardlist-info-header-text">
                    {selectedListCard.name}({selectedListCard.grade}등급)
                  </div>
                  <div style={{ display: 'flex', gap: '1.2em', marginTop: '0.3em', fontSize: '0.8em', opacity: 0.8 }}>
                    <span>강화 횟수: {selectedListCard.enhanceTryCount}/7</span>
                    <span>강화 성공: {selectedListCard.enhanceSuccessCount}</span>
                  </div>
                </NineSliceBox>

                {selectedListCard.specialAbility ? (
                  <>
                    {/* S등급: 능력치 + 특수능력 박스 나란히 */}
                    <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="cardlist-info-panel cardlist-info-stats-box">
                      <div className="cardlist-info-title">능력치</div>
                      <div className="cardlist-info-text"><img src={getSkillIcon(selectedListCard.skill1.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill1.skillType)} +{selectedListCard.skill1.value}</div>
                      <div className="cardlist-info-text"><img src={getSkillIcon(selectedListCard.skill2.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill2.skillType)} +{selectedListCard.skill2.value}</div>
                      <div className="cardlist-info-text"><img src={getSkillIcon(selectedListCard.skill3.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill3.skillType)} +{selectedListCard.skill3.value}</div>
                    </NineSliceBox>
                    <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={18} borderScale={0.35} className="cardlist-info-panel cardlist-s-grade-desc" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
                      <div className="cardlist-info-text">
                        능력 : {selectedListCard.specialAbility.name}
                      </div>
                      <div className="cardlist-info-text" style={{ marginTop: '0.4em', opacity: 0.85, fontSize: '0.85em' }}>
                        {selectedListCard.specialAbility.description}
                      </div>
                    </NineSliceBox>
                  </>
                ) : (
                  /* 비-S등급: 능력치 박스를 남은 공간 중앙에 배치 */
                  <div className="cardlist-stats-center-wrapper">
                    <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="cardlist-info-panel cardlist-info-stats-box">
                      <div className="cardlist-info-title">능력치</div>
                      <div className="cardlist-info-text"><img src={getSkillIcon(selectedListCard.skill1.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill1.skillType)} +{selectedListCard.skill1.value}</div>
                      <div className="cardlist-info-text"><img src={getSkillIcon(selectedListCard.skill2.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill2.skillType)} +{selectedListCard.skill2.value}</div>
                      <div className="cardlist-info-text"><img src={getSkillIcon(selectedListCard.skill3.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill3.skillType)} +{selectedListCard.skill3.value}</div>
                    </NineSliceBox>
                  </div>
                )}
              </div>
            </div>
            {/* 해고하기 버튼 영역 */}
            <div className="cardlist-fire-area">
              {selectedCardId && usedCardIds.includes(selectedCardId) ? (
                <button className="cardlist-fire-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  퀘스트 진행 중
                </button>
              ) : (
                <button className="cardlist-fire-btn" onClick={enterFireMode}>
                  해고하기
                </button>
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
    </div>
  );
}
