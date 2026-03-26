"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import api from "@/lib/axios";
import { getSynthesisProb, getSynthesisCost, getNextGrade, getRequiredCardCount } from "@/lib/synthesisLogic";
import { SynthesisAnimationOverlay } from "./SynthesisAnimationOverlay";
import "./synthesis.css";

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
  enhanceSuccessCount: number;
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

export default function SynthesisPage() {
  const { getAccessToken } = usePrivy();
  const { accessToken, gold, increaseGold, tutorialQuestStep } = useGameStore();
  const [synthArrowDismissed, setSynthArrowDismissed] = useState(false);
  useEffect(() => { setSynthArrowDismissed(false); }, [tutorialQuestStep]);
  const [showTutorialIntro, setShowTutorialIntro] = useState(() => tutorialQuestStep === 41);

  // --- 카드 목록 상태 ---
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCnt, setTotalCnt] = useState<number | null>(null);
  const [usedCardIds, setUsedCardIds] = useState<number[]>([]);

  // --- 선택된 카드 ID 목록 (합성 슬롯) ---
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  // --- 합성 결과 상태 ---
  const [synthesisResult, setSynthesisResult] = useState<{ success: boolean; resultCard?: CardListItem; cost: number } | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // --- 수동/자동 탭 ---
  const [synthMode, setSynthMode] = useState<'manual' | 'auto'>('manual');

  // --- 자동 합성 설정 상태 ---
  const [autoGrade, setAutoGrade] = useState<string>('A');
  const [autoCount, setAutoCount] = useState<number>(3);

  // --- 토스트 ---
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // --- 합성 애니메이션 상태 ---
  const [isAnimating, setIsAnimating] = useState(false);
  const [pendingResult, setPendingResult] = useState<{
    isSuccess: boolean;
    resultCard: CardListItem;
    sourceGrade: string;
    cost: number;
    selectedCardIds: number[];
  } | null>(null);

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
    // 튜토리얼 step41: API 대신 store의 tutorialCards 사용
    const tutState = useGameStore.getState();
    if (tutState.tutorialQuestStep !== null) {
      setCards(tutState.tutorialCards as unknown as CardListItem[]);
      setIsInitialLoad(false);
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
    setSelectedCards([]);
    setScrollRatio(0);
    setIsInitialLoad(true);
    fetchCards(null, capacitySort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacitySort]);

  // --- 선택된 카드의 등급 (첫 번째 카드 기준) ---
  const selectedGrade = useMemo(() => {
    if (selectedCards.length === 0) return null;
    const first = cards.find(c => c.cardId === selectedCards[0]);
    return first?.grade ?? null;
  }, [cards, selectedCards]);

  // --- 슬롯 수 동적 계산 ---
  const maxSlots = useMemo(() => {
    if (!selectedGrade) return 5;
    return getRequiredCardCount(selectedGrade).max;
  }, [selectedGrade]);

  const minSlots = useMemo(() => {
    if (!selectedGrade) return 3;
    return getRequiredCardCount(selectedGrade).min;
  }, [selectedGrade]);

  // --- 카드 클릭 (합성 슬롯 토글 + 등급 검증) ---
  const handleCardClick = useCallback((cardId: number) => {
    if (usedCardIds.includes(cardId)) {
      showToast('현재 퀘스트를 진행 중입니다');
      return;
    }
    setSynthesisResult(null);
    setSelectedCards(prev => {
      if (prev.includes(cardId)) return prev.filter(c => c !== cardId);
      // 슬롯 상한
      const currentMax = prev.length === 0 ? 5 : getRequiredCardCount(cards.find(c => c.cardId === prev[0])?.grade ?? 'D').max;
      if (prev.length >= currentMax) return prev;
      // 등급 검증: 첫 카드와 같은 등급만
      if (prev.length > 0) {
        const firstGrade = cards.find(c => c.cardId === prev[0])?.grade;
        const thisGrade = cards.find(c => c.cardId === cardId)?.grade;
        if (firstGrade !== thisGrade) return prev;
      }
      return [...prev, cardId];
    });
  }, [cards]);

  // --- 클라이언트 사이드 정렬 ---
  const sortedCards = useMemo(() => sortCards(cards, capacitySort, sortOrder), [cards, capacitySort, sortOrder]);

  // --- 합성 확률/비용 계산 ---
  const synthesisProb = useMemo(() => {
    if (!selectedGrade || selectedCards.length < minSlots) return 0;
    return getSynthesisProb(selectedGrade, selectedCards.length);
  }, [selectedGrade, selectedCards.length, minSlots]);

  const synthesisCost = useMemo(() => {
    if (!selectedGrade) return 0;
    return getSynthesisCost(selectedGrade);
  }, [selectedGrade]);

  const nextGrade = useMemo(() => {
    if (!selectedGrade) return '?';
    return getNextGrade(selectedGrade);
  }, [selectedGrade]);

  // --- 합성 실행 ---
  const handleSynthesize = useCallback(async () => {
    if (!selectedGrade || selectedCards.length < minSlots) return;

    // 튜토리얼 step41: API 대신 C_9 카드 합성 결과 반환
    if (tutorialQuestStep === 41) {
      const { generateSynthesisCard } = await import('@/lib/tutorialData');
      const resultCard = generateSynthesisCard();
      useGameStore.getState().removeTutorialCards(selectedCards);
      useGameStore.getState().addSynthesisCard(resultCard);
      setCards(prev => [...prev.filter(c => !selectedCards.includes(c.cardId)), resultCard as unknown as CardListItem]);
      setSelectedCards([]);
      setSynthesisResult({ success: true, resultCard: resultCard as unknown as CardListItem, cost: 0 });
      useGameStore.getState().setTutorialScriptId('step41_done');
      return;
    }

    if (isSynthesizing) return;
    setIsSynthesizing(true);
    try {
      const token = await getAuthToken();
      const cost = getSynthesisCost(selectedGrade);
      const { data: json } = await api.post(
        '/api/v1/synthesis/attempt',
        { cardIds: selectedCards, clientSeed: crypto.randomUUID() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const resData = json.data;
      const isSuccess: boolean = resData.success;
      // BE는 성공/실패 모두 resultCard 반환 (실패 시 같은 등급의 새 카드)
      const resultCard: CardListItem = resData.resultCard;

      // 애니메이션 시작 (실제 UI 업데이트는 onShowResult에서)
      setPendingResult({ isSuccess, resultCard, sourceGrade: selectedGrade, cost, selectedCardIds: [...selectedCards] });
      setIsAnimating(true);
    } catch (err: any) {
      const errCode = err?.response?.data?.error?.code;
      if (errCode === 'SY006') showToast('골드가 부족합니다.');
      else if (errCode === 'SY002') alert('같은 등급 카드만 합성 가능합니다.');
      else if (errCode === 'SY001') alert('카드 수가 올바르지 않습니다. (3~5장)');
      else if (errCode === 'SY005') alert('중복된 카드를 선택할 수 없습니다.');
      else alert('합성에 실패했습니다.');
    } finally {
      setIsSynthesizing(false);
    }
  }, [selectedGrade, selectedCards, minSlots, tutorialQuestStep, isSynthesizing, getAuthToken, showToast]);

  // 애니메이션 2.3초 시점: 결과 카드 노출 (카드 목록·결과 상태 업데이트)
  const handleAnimationShowResult = useCallback(() => {
    if (!pendingResult) return;
    const { isSuccess, resultCard, cost, selectedCardIds } = pendingResult;
    increaseGold(-cost);
    setCards(prev => [...prev.filter(c => !selectedCardIds.includes(c.cardId)), resultCard]);
    setSelectedCards([]);
    setSynthesisResult({ success: isSuccess, resultCard, cost });
  }, [pendingResult, increaseGold]);

  // 애니메이션 3.9초 시점: 오버레이 닫기
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
    setPendingResult(null);
  }, []);

  // --- 자동 합성 실행 ---
  const handleAutoSynthesize = useCallback(async () => {
    if (isSynthesizing) return;

    const { min, max } = getRequiredCardCount(autoGrade);
    const clampedCount = Math.min(Math.max(autoCount, min), max);
    const gradeCards = cards.filter(c => c.grade === autoGrade);

    if (gradeCards.length < clampedCount) {
      alert(`${autoGrade}등급 카드가 ${clampedCount}장 이상 필요합니다. (현재 ${gradeCards.length}장)`);
      return;
    }

    const pickedIds = gradeCards.slice(0, clampedCount).map(c => c.cardId);

    setIsSynthesizing(true);
    try {
      const token = await getAuthToken();
      const cost = getSynthesisCost(autoGrade);
      const { data: json } = await api.post(
        '/api/v1/synthesis/attempt',
        { cardIds: pickedIds, clientSeed: crypto.randomUUID() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const resData = json.data;
      const isSuccess: boolean = resData.success;
      const resultCard: CardListItem = resData.resultCard;

      setSelectedCards([]);
      setSynthesisResult(null);
      setPendingResult({ isSuccess, resultCard, sourceGrade: autoGrade, cost, selectedCardIds: pickedIds });
      setIsAnimating(true);
    } catch (err: any) {
      const errCode = err?.response?.data?.error?.code;
      if (errCode === 'SY006') showToast('골드가 부족합니다.');
      else alert('자동 합성에 실패했습니다.');
    } finally {
      setIsSynthesizing(false);
    }
  }, [isSynthesizing, autoGrade, autoCount, cards, getAuthToken, showToast]);

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
    <div className="cardlist-page-container">

      {/* 튜토리얼 합성 안내 오버레이 */}
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
            <div style={{ fontSize: '1.3rem', color: '#c8e8ff', lineHeight: 1.8 }}>3장의 카드를 모두 사용해 합성해보자</div>
            <div style={{ fontSize: '0.85rem', color: '#6688bb', marginTop: '0.8rem' }}>▶ 클릭하여 계속</div>
          </div>
        </div>
      )}

      {isAnimating && pendingResult && (
        <SynthesisAnimationOverlay
          resultCard={pendingResult.resultCard}
          sourceGrade={pendingResult.sourceGrade}
          isSuccess={pendingResult.isSuccess}
          onShowResult={handleAnimationShowResult}
          onComplete={handleAnimationComplete}
        />
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
          <h1 className="cardlist-page-title">카드 합성</h1>
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
          {tutorialQuestStep === 41 && selectedCards.length < minSlots && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.5cqw' }}>
              <img
                src={`${ASSET_BASE}/assets/tutorial/arrow.webp`}
                alt=""
                className="tutorial-arrow-y"
                style={{ display: 'block', height: '4.7cqw', width: 'auto', imageRendering: 'pixelated', pointerEvents: 'none' }}
              />
              <span style={{ color: '#ffd700', fontSize: '1.3cqw', fontWeight: 'bold', textShadow: '1px 1px 0 #000', whiteSpace: 'nowrap' }}>
                {minSlots}장 선택하세요
              </span>
            </div>
          )}
          <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={24} borderScale={0.5} className="cardlist-left-box">
            {toastMsg && (
              <div className="synthesis-toast">{toastMsg}</div>
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
                    const isSelected = selectedCards.includes(card.cardId);
                    const isDisabled = selectedGrade !== null && card.grade !== selectedGrade && !isSelected;
                    const isUsed = usedCardIds.includes(card.cardId);
                    return (
                      <div
                        key={card.cardId}
                        className={`cardlist-card-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'synthesis-disabled' : ''}`}
                        data-grade={card.grade}
                        onClick={() => !isDisabled && handleCardClick(card.cardId)}
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

        {/* ──── 우측: 합성 카드 배치 패널 (퀘스트 Phase2 스타일) ──── */}
        <NineSliceBox
          src={`${ASSET_BASE}/assets/008/questInf_000.webp`}
          slice={[121, 248, 85, 248]}
          framePadding={20}
          borderScale={0.5}
          className="synthesis-right-box"
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

          {!synthesisResult ? (
            <>
              {/* 수동 / 자동 탭 */}
              <div className="synthesis-tab-row">
                <button
                  className={`synthesis-tab-btn${synthMode === 'manual' ? ' active' : ''}`}
                  onClick={() => setSynthMode('manual')}
                >수동 합성</button>
                <button
                  className={`synthesis-tab-btn${synthMode === 'auto' ? ' active' : ''}`}
                  onClick={() => setSynthMode('auto')}
                >자동 선택</button>
              </div>

              {synthMode === 'manual' ? (
                <>
                  {/* 합성 제목 + 카드 배치 현황판 */}
                  <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="synthesis-drop-box">
                    <div className="synthesis-info-title">카드 합성</div>
                    <div className="synthesis-info-subtitle">
                      카드 배치 : {selectedCards.length} / {selectedGrade === 'S' ? '2' : `${minSlots}~${maxSlots}`}장
                      {selectedGrade && <span style={{ marginLeft: 8 }}>({selectedGrade} → {nextGrade})</span>}
                    </div>
                    <div className="synthesis-drop-cards">
                      {(() => {
                        const total = maxSlots;
                        const cardWidth = total <= 2 ? 100 : total === 3 ? 130 : total === 4 ? 110 : 95;
                        const overlap = total <= 2 ? -10 : total === 3 ? -20 : total === 4 ? -25 : -30;
                        const fanAngle = total <= 2 ? 6 : total === 3 ? 10 : total === 4 ? 8 : 6;
                        const yMultiplier = total <= 2 ? 6 : total === 3 ? 10 : total === 4 ? 8 : 6;
                        return Array.from({ length: total }).map((_, index) => {
                          const cardId = selectedCards[index];
                          const card = cardId ? cards.find(c => c.cardId === cardId) : null;
                          const angle = (index - (total - 1) / 2) * fanAngle;
                          const yOffset = Math.abs(index - (total - 1) / 2) * yMultiplier;
                          const style = {
                            width: `${cardWidth}px`,
                            zIndex: index,
                            marginLeft: index > 0 ? `${overlap}px` : '0',
                            transform: `rotate(${angle}deg) translateY(${yOffset}px)`,
                          };
                          if (!card) {
                            return (
                              <div key={`slot-${index}`} className="synthesis-fan-card synthesis-fan-placeholder" style={style}>
                                <div className="synthesis-placeholder-inner">?</div>
                              </div>
                            );
                          }
                          return (
                            <div key={card.cardId} className="synthesis-fan-card" style={style} onClick={() => handleCardClick(card.cardId)}>
                              <img src={card.imageUrl} alt={card.name} draggable={false} />
                              <span className="synthesis-fan-stat stat-1"><img src={getSkillIcon(card.skill1.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                              <span className="synthesis-fan-stat stat-2"><img src={getSkillIcon(card.skill2.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                              <span className="synthesis-fan-stat stat-3"><img src={getSkillIcon(card.skill3.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </NineSliceBox>

                  {/* 합성 확률 박스 */}
                  <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="synthesis-info-box synthesis-info-box-full">
                    <div className="synthesis-info-box-label">합성 확률 및 비용</div>
                    <div className="synthesis-info-box-text">
                      {selectedGrade ? (
                        <>
                          <div>성공률 : {selectedCards.length >= minSlots ? `${synthesisProb}%` : '-'}</div>
                          <div>비용 : {synthesisCost.toLocaleString()}G</div>
                        </>
                      ) : (
                        <div style={{ color: '#8a8ab0' }}>카드를 선택해주세요</div>
                      )}
                    </div>
                  </NineSliceBox>

                  {/* 합성하기 / 초기화 버튼 */}
                  <div className="synthesis-action-buttons">
                    <NineSliceBox
                      src={`${ASSET_BASE}/assets/008/questCard_000.webp`}
                      slice={[200, 208, 200, 208]}
                      framePadding={14}
                      borderScale={0.4}
                      className="synthesis-btn-cancel"
                      onClick={() => { setSelectedCards([]); setSynthesisResult(null); }}
                    >
                      <span style={{ position: 'relative', zIndex: 2 }}>초기화</span>
                    </NineSliceBox>
                    <div style={{ position: 'relative' }}>
                      {tutorialQuestStep === 41 && selectedCards.length >= minSlots && !synthArrowDismissed && (
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
                      <NineSliceBox
                        src={`${ASSET_BASE}/assets/008/questCard_000.webp`}
                        slice={[200, 208, 200, 208]}
                        framePadding={14}
                        borderScale={0.4}
                        className={`synthesis-btn-accept ${selectedCards.length < minSlots || isSynthesizing ? 'disabled' : ''}`}
                        onClick={() => { setSynthArrowDismissed(true); handleSynthesize(); }}
                      >
                        <span style={{ position: 'relative', zIndex: 2 }}>합성하기</span>
                      </NineSliceBox>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 자동 선택: 카드 미리보기 */}
                  <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="synthesis-drop-box">
                    <div className="synthesis-info-title">자동 선택</div>
                    <div className="synthesis-info-subtitle">
                      {autoGrade}등급 카드 {autoCount}장 자동 선택 → {getNextGrade(autoGrade)}등급 도전
                    </div>
                    <div className="synthesis-drop-cards">
                      {(() => {
                        const gradeCards = cards.filter(c => c.grade === autoGrade);
                        const total = getRequiredCardCount(autoGrade).max;
                        const cardWidth = total <= 2 ? 100 : total === 3 ? 130 : total === 4 ? 110 : 95;
                        const overlap = total <= 2 ? -10 : total === 3 ? -20 : total === 4 ? -25 : -30;
                        const fanAngle = total <= 2 ? 6 : total === 3 ? 10 : total === 4 ? 8 : 6;
                        const yMultiplier = total <= 2 ? 6 : total === 3 ? 10 : total === 4 ? 8 : 6;
                        return Array.from({ length: total }).map((_, index) => {
                          // autoCount 이하 인덱스만 실제 카드, 나머지는 placeholder
                          const card = index < autoCount ? (gradeCards[index] ?? null) : null;
                          const angle = (index - (total - 1) / 2) * fanAngle;
                          const yOffset = Math.abs(index - (total - 1) / 2) * yMultiplier;
                          const style = {
                            width: `${cardWidth}px`,
                            zIndex: index,
                            marginLeft: index > 0 ? `${overlap}px` : '0',
                            transform: `rotate(${angle}deg) translateY(${yOffset}px)`,
                          };
                          if (!card) {
                            return (
                              <div key={`auto-slot-${index}`} className="synthesis-fan-card synthesis-fan-placeholder" style={style}>
                                <div className="synthesis-placeholder-inner">?</div>
                              </div>
                            );
                          }
                          return (
                            <div key={card.cardId} className="synthesis-fan-card" style={{ ...style, opacity: 0.85 }}>
                              <img src={card.imageUrl} alt={card.name} draggable={false} />
                              <span className="synthesis-fan-stat stat-1"><img src={getSkillIcon(card.skill1.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                              <span className="synthesis-fan-stat stat-2"><img src={getSkillIcon(card.skill2.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                              <span className="synthesis-fan-stat stat-3"><img src={getSkillIcon(card.skill3.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </NineSliceBox>

                  {/* 자동 합성 설정 */}
                  <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="synthesis-info-box synthesis-info-box-full">
                    <div className="synthesis-info-box-label">설정</div>
                    <div className="synthesis-info-box-text">
                      <div className="synthesis-auto-row">
                        <span className="synthesis-auto-label">등급</span>
                        <div className="synthesis-auto-select-wrapper">
                          <select
                            className="cardlist-select synthesis-auto-select"
                            value={autoGrade}
                            onChange={e => {
                              const g = e.target.value;
                              setAutoGrade(g);
                              setAutoCount(getRequiredCardCount(g).min);
                            }}
                          >
                            {['D', 'C', 'B', 'A', 'S'].map(g => (
                              <option key={g} value={g}>{g}등급</option>
                            ))}
                          </select>
                        </div>
                        <span className="synthesis-auto-label">장 수</span>
                        <div className="synthesis-auto-select-wrapper">
                          <select
                            className="cardlist-select synthesis-auto-select"
                            value={autoCount}
                            onChange={e => setAutoCount(Number(e.target.value))}
                          >
                            {(() => {
                              const { min, max } = getRequiredCardCount(autoGrade);
                              return Array.from({ length: max - min + 1 }, (_, i) => min + i).map(n => (
                                <option key={n} value={n}>{n}장</option>
                              ));
                            })()}
                          </select>
                        </div>
                      </div>
                      <div style={{ color: '#8a8ab0', marginTop: 6 }}>
                        성공률 : {getSynthesisProb(autoGrade, autoCount)}% &nbsp;|&nbsp; 비용 : {getSynthesisCost(autoGrade).toLocaleString()}G
                      </div>
                    </div>
                  </NineSliceBox>

                  {/* 자동 합성 실행 버튼 */}
                  <div className="synthesis-action-buttons">
                    <NineSliceBox
                      src={`${ASSET_BASE}/assets/008/questCard_000.webp`}
                      slice={[200, 208, 200, 208]}
                      framePadding={14}
                      borderScale={0.4}
                      className={`synthesis-btn-accept ${isSynthesizing || cards.filter(c => c.grade === autoGrade).length < autoCount ? 'disabled' : ''}`}
                      style={{ flex: 1 }}
                      onClick={handleAutoSynthesize}
                    >
                      <span style={{ position: 'relative', zIndex: 2 }}>자동 합성 실행</span>
                    </NineSliceBox>
                  </div>
                </>
              )}
            </>
          ) : (
            /* === 합성 결과 화면 === */
            <div className="synthesis-result-panel">
              <div className="synthesis-result-title" style={{ color: synthesisResult.success ? '#2a6' : '#c44' }}>
                합성 {synthesisResult.success ? '성공!' : '실패'}
              </div>

              {synthesisResult.resultCard && (
                <div className="synthesis-result-card-area">
                  <div className="synthesis-result-card-wrapper">
                    <img src={synthesisResult.resultCard.imageUrl} alt={synthesisResult.resultCard.name} draggable={false} />
                    <span className="cardlist-card-stat stat-1"><img src={getSkillIcon(synthesisResult.resultCard.skill1.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(synthesisResult.resultCard.skill1.skillType)} {synthesisResult.resultCard.skill1.value}</span>
                    <span className="cardlist-card-stat stat-2"><img src={getSkillIcon(synthesisResult.resultCard.skill2.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(synthesisResult.resultCard.skill2.skillType)} {synthesisResult.resultCard.skill2.value}</span>
                    <span className="cardlist-card-stat stat-3"><img src={getSkillIcon(synthesisResult.resultCard.skill3.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(synthesisResult.resultCard.skill3.skillType)} {synthesisResult.resultCard.skill3.value}</span>
                  </div>
                  <div className="synthesis-result-card-name">
                    {synthesisResult.resultCard.name} ({synthesisResult.resultCard.grade}등급)
                  </div>
                </div>
              )}

              <div className="synthesis-action-buttons">
                <NineSliceBox
                  src={`${ASSET_BASE}/assets/008/questCard_000.webp`}
                  slice={[200, 208, 200, 208]}
                  framePadding={14}
                  borderScale={0.4}
                  className="synthesis-btn-accept"
                  onClick={() => setSynthesisResult(null)}
                >
                  <span style={{ position: 'relative', zIndex: 2 }}>확인</span>
                </NineSliceBox>
              </div>
            </div>
          )}
        </NineSliceBox>

      </div>
    </div>
  );
}
