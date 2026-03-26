"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import api from "@/lib/axios";
import { EnhanceResult, getEnhanceData } from "@/lib/enhanceLogic";
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

function normalizeSkillType(type: string): string {
  const upper = type.toUpperCase();
  return upper === 'DEV' || upper === 'DEVOPS' ? 'DEVOPS' : upper;
}

function getSkillIcon(type: string): string {
  return `${ASSET_BASE}/assets/003-01/${normalizeSkillType(type).toLowerCase()}.webp`;
}

const SKILL_ICON_STYLE: React.CSSProperties = { height: '1em', width: 'auto', verticalAlign: 'middle', imageRendering: 'pixelated', display: 'inline-block' };
const SKILL_ICON_DETAIL_STYLE: React.CSSProperties = { height: '0.8em', width: 'auto', verticalAlign: 'middle', position: 'relative', top: '-5px', imageRendering: 'pixelated', display: 'inline-block' };

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

interface CardDetailData {
  cardId: number;
  grade: string;
  name: string;
  stats: { [key: string]: number };
  enhanceLevel: number;
  enhanceTryCount?: number;     // BE UserCardResponse 필드명
  enhanceSuccessCount?: number; // BE UserCardResponse 필드명
}

// --- 스킬 필터 옵션 ---
const SKILL_FILTERS = ["ALL", "BE", "FE", "AI", "DBA", "DEV", "DESIGN"] as const;

function getCardStatForType(card: CardListItem, type: string): number {
  const norm = type.toUpperCase() === 'DEV' ? 'DEVOPS' : type.toUpperCase();
  let total = 0;
  if (card.skill1.skillType.toUpperCase() === norm) total += card.skill1.value;
  if (card.skill2.skillType.toUpperCase() === norm) total += card.skill2.value;
  if (card.skill3.skillType.toUpperCase() === norm) total += card.skill3.value;
  return total;
}

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

interface LocalEnhanceState {
  enhanceLevel: number;
  enhanceTries: number;
  addedStats: { skill1: number; skill2: number; skill3: number };
}

export default function EnhancePage() {
  const { getAccessToken } = usePrivy();
  const { accessToken, gold, increaseGold, tutorialQuestStep, tutorialEnhanceCount } = useGameStore();
  const [enhanceArrowDismissed, setEnhanceArrowDismissed] = useState(false);
  useEffect(() => { setEnhanceArrowDismissed(false); }, [tutorialQuestStep]);
  const [showTutorialIntro, setShowTutorialIntro] = useState(() => tutorialQuestStep === 31);

  // --- 로컬 강화 상태 ---
  const [localEnhancements, setLocalEnhancements] = useState<Record<number, LocalEnhanceState>>({});
  const [enhanceResult, setEnhanceResult] = useState<(EnhanceResult & { previousStats: { skill1: number; skill2: number; skill3: number } }) | null>(null);

  // --- 애니메이션 상태 ---
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [pendingResult, setPendingResult] = useState<(EnhanceResult & { previousStats: { skill1: number; skill2: number; skill3: number } }) | null>(null);

  // --- 카드 목록 상태 ---
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCnt, setTotalCnt] = useState<number | null>(null);
  const [usedCardIds, setUsedCardIds] = useState<number[]>([]);
  const [usedWarning, setUsedWarning] = useState(false);
  const usedWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showUsedWarning = useCallback(() => {
    if (usedWarningTimerRef.current) clearTimeout(usedWarningTimerRef.current);
    setUsedWarning(true);
    usedWarningTimerRef.current = setTimeout(() => setUsedWarning(false), 2500);
  }, []);

  // --- 선택 / 상세 상태 ---
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CardDetailData | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // --- 필터 / 정렬 상태 ---
  const [capacitySort, setCapacitySort] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // --- 인증 토큰 ---
  const getAuthToken = useCallback(async () => {
    return accessToken || await getAccessToken();
  }, [accessToken, getAccessToken]);

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
    // 튜토리얼 step31: API 대신 store의 tutorialCards 사용
    const tutState = useGameStore.getState();
    if (tutState.tutorialQuestStep !== null) {
      setCards(tutState.tutorialCards as unknown as CardListItem[]);
      setIsInitialLoad(false);
      if (tutState.tutorialCards.length > 0) {
        setSelectedCardId(tutState.tutorialCards[0].cardId);
      }
      return;
    }
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
      const { data: json } = await api.get('/api/v1/enhancements/cards', {
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
    if (usedCardIds.includes(cardId)) {
      showUsedWarning();
      return;
    }
    setSelectedCardId(cardId);
    fetchCardDetail(cardId);
    setEnhanceResult(null);
  }, [fetchCardDetail, usedCardIds, showUsedWarning]);

  // --- 클라이언트 사이드 정렬 ---
  const sortedCards = useMemo(() => sortCards(cards, capacitySort, sortOrder), [cards, capacitySort, sortOrder]);

  // --- 선택된 카드의 리스트 데이터 ---
  const selectedListCard = useMemo(() => {
    return cards.find(c => c.cardId === selectedCardId) || null;
  }, [cards, selectedCardId]);

  // --- 추가된 로컬 상탯값 계산 ---
  const currentEnhancement = selectedCardId ? localEnhancements[selectedCardId] : null;

  const displayEnhanceLevel = currentEnhancement ? currentEnhancement.enhanceLevel : (selectedListCard?.enhanceSuccessCount || 0);
  const displayEnhanceTries = currentEnhancement ? currentEnhancement.enhanceTries : (selectedListCard?.enhanceTryCount || 0);

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

  // --- 강화 API 호출 ---
  const handleEnhance = useCallback(async () => {
    if (!selectedListCard || isEnhancing) return;
    if (usedCardIds.includes(selectedListCard.cardId)) return;

    // 튜토리얼 step31: API 대신 store 강화 (애니메이션 포함)
    if (tutorialQuestStep === 31) {
      const cost = getEnhanceData(selectedListCard.grade).cost;
      setPendingResult({
        success: true,
        cost,
        statsAdded: { skill1: 10, skill2: 10, skill3: 10 },
        previousStats: { skill1: displaySkill1, skill2: displaySkill2, skill3: displaySkill3 },
      });
      setIsAnimating(true);
      return;
    }

    setIsEnhancing(true);
    try {
      const token = await getAuthToken();
      const cost = getEnhanceData(selectedListCard.grade).cost;
      const { data: json } = await api.post(
        `/api/v1/enhancements/cards/${selectedListCard.cardId}`,
        { cardId: selectedListCard.cardId, clientSeed: crypto.randomUUID() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const resData = json.data;
      const isSuccess: boolean = resData.success;

      const result: EnhanceResult = {
        success: isSuccess,
        cost,
        statsAdded: isSuccess
          ? {
              skill1: resData.increasedValue1 ?? resData.increasedValue ?? 0,
              skill2: resData.increasedValue2 ?? resData.increasedValue ?? 0,
              skill3: resData.increasedValue3 ?? resData.increasedValue ?? 0,
            }
          : { skill1: 0, skill2: 0, skill3: 0 },
      };

      increaseGold(-cost);
      setPendingResult({
        ...result,
        previousStats: { skill1: displaySkill1, skill2: displaySkill2, skill3: displaySkill3 },
      });
      setIsAnimating(true);
    } catch (err: any) {
      const errCode = err?.response?.data?.error?.code ?? err?.response?.data?.code;
      const errMsg = err?.response?.data?.message
        ?? (errCode === 'C008' || errCode === 'EN001' ? '강화 횟수를 초과했습니다.'
          : errCode === 'U003' || errCode === 'GD002' ? '골드가 부족합니다.'
          : '강화에 실패했습니다.');
      useGameStore.getState().openComingSoonModal(errMsg);
    } finally {
      setIsEnhancing(false);
    }
  }, [selectedListCard, isEnhancing, getAuthToken, increaseGold, displaySkill1, displaySkill2, displaySkill3]);

  return (
    <div className="cardlist-page-container enhance-page">

      {/* 튜토리얼 강화 안내 오버레이 */}
      {showTutorialIntro && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center pointer-events-auto font-dot"
          style={{ background: 'rgba(0,0,8,0.85)' }}
          onClick={() => setShowTutorialIntro(false)}
        >
          <div style={{
            background: 'rgba(8,18,58,0.97)',
            border: '2px solid #3a6fad',
            borderRadius: '4px',
            padding: '2rem 3rem',
            maxWidth: '500px',
            textAlign: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}>
            <div style={{ fontSize: '0.85rem', color: '#7ab8ff', marginBottom: '0.8rem', letterSpacing: '0.1em' }}>[ System ]</div>
            <div style={{ fontSize: '1.3rem', color: '#c8e8ff', lineHeight: 1.8 }}>카드를 3회 강화해보자</div>
            <div style={{ fontSize: '0.85rem', color: '#6688bb', marginTop: '0.8rem' }}>▶ 클릭하여 계속</div>
          </div>
        </div>
      )}

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
              title="능력치 내림차순"
            >▼ 내림차순</button>
            <button
              className={`cardlist-filter-btn${sortOrder === 'asc' ? ' active' : ''}`}
              onClick={() => setSortOrder('asc')}
              title="능력치 오름차순"
            >▲ 오름차순</button>
            {totalCnt !== null && (
              <span className="cardlist-total-cnt">{totalCnt} / 200</span>
            )}
          </div>

          {/* 카드 리스트 박스 */}
          {tutorialQuestStep === 31 && !selectedCardId && (
            <img
              src={`${ASSET_BASE}/assets/tutorial/arrow.webp`}
              alt=""
              className="tutorial-arrow-y"
              style={{
                display: 'block', margin: '0 auto 0.5cqw',
                height: '4.7cqw', width: 'auto',
                imageRendering: 'pixelated', pointerEvents: 'none',
              }}
            />
          )}
          <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={24} borderScale={0.5} className="cardlist-left-box">
            {usedWarning && (
              <div className="synthesis-toast">현재 퀘스트를 진행 중입니다</div>
            )}
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
                    const isUsed = usedCardIds.includes(card.cardId);
                    return (
                      <div
                        key={card.cardId}
                        style={{ position: 'relative' }}
                      >
                        {tutorialQuestStep === 31 && tutorialEnhanceCount > 0 && tutorialEnhanceCount < 3 && (
                          <img
                            src={`${ASSET_BASE}/assets/tutorial/arrow.webp`}
                            alt=""
                            className="tutorial-arrow-y"
                            style={{
                              position: 'absolute', bottom: '100%', left: '50%',
                              transform: 'translateX(-50%)',
                              height: '4.7cqw', width: 'auto',
                              imageRendering: 'pixelated', pointerEvents: 'none', zIndex: 100,
                            }}
                          />
                        )}
                        <div
                          className={`cardlist-card-item ${isSelected ? 'selected' : ''}`}
                          data-grade={card.grade}
                          onClick={() => handleCardClick(card.cardId)}
                          style={isUsed ? { filter: 'brightness(0.5)', cursor: 'not-allowed' } : undefined}
                          title={isUsed ? '퀘스트 진행 중인 카드입니다' : undefined}
                        >
                          <img src={card.imageUrl} alt={card.name} draggable={false} loading="lazy" decoding="async" />
                          {card.enhanceSuccessCount > 0 && (
                            <span className="card-enhance-badge" data-level={String(card.enhanceSuccessCount)} data-grade={card.grade}>
                              <span className="badge-plus">+</span><span className="badge-num">{card.enhanceSuccessCount}</span>
                            </span>
                          )}
                          <span className="cardlist-card-stat stat-1"><img src={getSkillIcon(card.skill1.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                          <span className="cardlist-card-stat stat-2"><img src={getSkillIcon(card.skill2.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                          <span className="cardlist-card-stat stat-3"><img src={getSkillIcon(card.skill3.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
                        </div>
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
                  <span className="cardlist-big-card-stat stat-1"><img src={getSkillIcon(selectedListCard.skill1.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill1.skillType)} {selectedListCard.skill1.value}</span>
                  <span className="cardlist-big-card-stat stat-2"><img src={getSkillIcon(selectedListCard.skill2.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill2.skillType)} {selectedListCard.skill2.value}</span>
                  <span className="cardlist-big-card-stat stat-3"><img src={getSkillIcon(selectedListCard.skill3.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill3.skillType)} {selectedListCard.skill3.value}</span>
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
                      <div className="cardlist-info-text"><img src={getSkillIcon(selectedListCard.skill1.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill1.skillType)} +{displaySkill1}</div>
                      <div className="cardlist-info-text"><img src={getSkillIcon(selectedListCard.skill2.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill2.skillType)} +{displaySkill2}</div>
                      <div className="cardlist-info-text"><img src={getSkillIcon(selectedListCard.skill3.skillType)} alt="" style={SKILL_ICON_DETAIL_STYLE} /> {displaySkillType(selectedListCard.skill3.skillType)} +{displaySkill3}</div>
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
                    <div style={{ position: 'relative' }}>
                      {tutorialQuestStep === 31 && !enhanceArrowDismissed && (
                        <img
                          src={`${ASSET_BASE}/assets/tutorial/arrow.webp`}
                          alt=""
                          className="tutorial-arrow-y"
                          style={{
                            position: 'absolute', bottom: '100%', left: '50%',
                            transform: 'translateX(-50%)',
                            height: '4.7cqw', width: 'auto',
                            imageRendering: 'pixelated', pointerEvents: 'none', zIndex: 100,
                          }}
                        />
                      )}
                      {selectedListCard && usedCardIds.includes(selectedListCard.cardId) ? (
                        <button className="enhance-action-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                          퀘스트 진행 중
                        </button>
                      ) : (
                        <button
                          className="enhance-action-btn"
                          disabled={displayEnhanceTries >= 7 || isEnhancing}
                          onClick={() => { setEnhanceArrowDismissed(true); handleEnhance(); }}
                        >
                          {isEnhancing ? '강화 중...' : '강화하기'}
                        </button>
                      )}
                    </div>
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
                    <div className="enhance-modal-title" style={{ color: enhanceResult.success ? '#222' : '#888' }}>
                      강화 {enhanceResult.success ? '성공!' : '실패'}
                    </div>

                    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      {enhanceResult.success && enhanceResult.statsAdded && (
                        <div className="enhance-modal-content" style={{ textAlign: 'center' }}>
                          <div className="enhance-modal-text" style={{ marginBottom: 6 }}>
                            {displaySkillType(selectedListCard.skill1.skillType)} {enhanceResult.previousStats.skill1} &rarr; {enhanceResult.previousStats.skill1 + enhanceResult.statsAdded.skill1} <span style={{color: '#4caf50', fontWeight: 'bold'}}>(+{enhanceResult.statsAdded.skill1})</span>
                          </div>
                          <div className="enhance-modal-text" style={{ marginBottom: 6 }}>
                            {displaySkillType(selectedListCard.skill2.skillType)} {enhanceResult.previousStats.skill2} &rarr; {enhanceResult.previousStats.skill2 + enhanceResult.statsAdded.skill2} <span style={{color: '#4caf50', fontWeight: 'bold'}}>(+{enhanceResult.statsAdded.skill2})</span>
                          </div>
                          <div className="enhance-modal-text" style={{ marginBottom: 6 }}>
                            {displaySkillType(selectedListCard.skill3.skillType)} {enhanceResult.previousStats.skill3} &rarr; {enhanceResult.previousStats.skill3 + enhanceResult.statsAdded.skill3} <span style={{color: '#4caf50', fontWeight: 'bold'}}>(+{enhanceResult.statsAdded.skill3})</span>
                          </div>
                        </div>
                      )}

                      {!enhanceResult.success && (
                        <div className="enhance-modal-content" style={{ textAlign: 'center', marginTop: 8 }}>
                          <div className="enhance-modal-text" style={{ color: '#ff6b6b' }}>(스탯 변화 없음)</div>
                        </div>
                      )}

                      <div className="enhance-modal-tries" style={{ marginTop: 16, marginBottom: 16 }}>
                        남은 강화횟수 : {Math.max(0, 7 - (displayEnhanceTries))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: 'auto', paddingBottom: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        {tutorialQuestStep === 31 && tutorialEnhanceCount > 0 && tutorialEnhanceCount < 3 && (
                          <img
                            src={`${ASSET_BASE}/assets/tutorial/arrow.webp`}
                            alt=""
                            className="tutorial-arrow-y"
                            style={{
                              position: 'absolute', bottom: '100%', left: '50%',
                              transform: 'translateX(-50%)',
                              height: '4.7cqw', width: 'auto',
                              imageRendering: 'pixelated', pointerEvents: 'none', zIndex: 100,
                            }}
                          />
                        )}
                        <button
                          className="enhance-result-btn"
                          disabled={displayEnhanceTries >= 7 || isEnhancing}
                          onClick={() => { setEnhanceResult(null); handleEnhance(); }}
                        >
                          {isEnhancing ? '강화 중...' : `연속 강화${tutorialQuestStep === 31 ? ` (${tutorialEnhanceCount}/3)` : ''}`}
                        </button>
                      </div>
                      <button
                        className="enhance-result-btn"
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
          statChanges={pendingResult.statsAdded ? [
            {
              skillType: selectedListCard.skill1.skillType,
              before: pendingResult.previousStats.skill1,
              after: pendingResult.previousStats.skill1 + pendingResult.statsAdded.skill1,
              delta: pendingResult.statsAdded.skill1,
            },
            {
              skillType: selectedListCard.skill2.skillType,
              before: pendingResult.previousStats.skill2,
              after: pendingResult.previousStats.skill2 + pendingResult.statsAdded.skill2,
              delta: pendingResult.statsAdded.skill2,
            },
            {
              skillType: selectedListCard.skill3.skillType,
              before: pendingResult.previousStats.skill3,
              after: pendingResult.previousStats.skill3 + pendingResult.statsAdded.skill3,
              delta: pendingResult.statsAdded.skill3,
            },
          ] : undefined}
          onShowResult={() => {
            // 튜토리얼: store에 강화 반영
            if (useGameStore.getState().tutorialQuestStep === 31) {
              useGameStore.getState().enhanceTutorialCard(selectedListCard.cardId);
              setCards(useGameStore.getState().tutorialCards as unknown as CardListItem[]);
            }

            // 애니메이션 진행 중(3.5초 지점) 카드 왼쪽 슬라이드와 함께 실제 상태 반영 & 결과 모달 표출
            let newLevel = displayEnhanceLevel;

            if (pendingResult.success && pendingResult.statsAdded) {
              newLevel += 1;
              // cards 배열 직접 업데이트 → 카드 목록에 실시간 반영
              setCards(prev => prev.map(card => {
                if (card.cardId !== selectedListCard.cardId) return card;
                return {
                  ...card,
                  skill1: { ...card.skill1, value: card.skill1.value + pendingResult.statsAdded!.skill1 },
                  skill2: { ...card.skill2, value: card.skill2.value + pendingResult.statsAdded!.skill2 },
                  skill3: { ...card.skill3, value: card.skill3.value + pendingResult.statsAdded!.skill3 },
                  enhanceSuccessCount: card.enhanceSuccessCount + 1,
                };
              }));
            }

            // cards 배열에 반영됐으므로 delta(addedStats)는 0으로 리셋
            setLocalEnhancements(prev => ({
              ...prev,
              [selectedListCard.cardId]: {
                enhanceLevel: newLevel,
                enhanceTries: displayEnhanceTries + 1,
                addedStats: { skill1: 0, skill2: 0, skill3: 0 },
              }
            }));

            // 결과 모달 띄우기 (컴포넌트 마운트 및 CSS fade-in)
            setEnhanceResult(pendingResult);
          }}
          onComplete={() => {
            // 모든 연출 완전 종료 시 (4.5초) Phaser 컨테이너만 언마운트
            setIsAnimating(false);
            setPendingResult(null);
            // 튜토리얼: 3회 강화 완료 시 스크립트 표시
            if (useGameStore.getState().tutorialQuestStep === 31) {
              const newCount = useGameStore.getState().tutorialEnhanceCount;
              if (newCount >= 3) {
                useGameStore.getState().setTutorialScriptId('step31_done');
              }
            }
          }}
        />
      )}
    </div>
  );
}
