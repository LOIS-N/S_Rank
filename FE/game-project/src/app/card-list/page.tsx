"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
// [로컬 테스트용] axios 인스턴스 import - 실제 배포 시에는 주석 처리가 필요합니다.
import "./card-list.css";

// [실제 배포용] fetch 방식 전환 시 사용 - 현재 axios 사용 중이므로 미사용
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const API_HOST = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
  specialAbility: string | null;
}

interface CardDetailData {
  cardId: number;
  grade: string;
  name: string;
  stats: { [key: string]: number };
  enhanceLevel: number;
}

// --- 등급 우선순위 ---
const GRADE_RANK: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

// --- 스킬 필터 옵션 ---
const SKILL_FILTERS = ["ALL", "BE", "FE", "AI", "DBA", "DEVOPS", "DESIGN"] as const;

// --- 유틸 함수 ---
const getTotalSkillValue = (card: CardListItem): number => {
  return card.skill1.value + card.skill2.value + card.skill3.value;
};

const getSkillValue = (card: CardListItem, skillType: string): number => {
  if (card.skill1.skillType === skillType) return card.skill1.value;
  if (card.skill2.skillType === skillType) return card.skill2.value;
  if (card.skill3.skillType === skillType) return card.skill3.value;
  return 0;
};

export default function CardListPage() {
  const { getAccessToken } = usePrivy();
  const { accessToken } = useGameStore();

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
  // [로컬 테스트용] api(axios) 사용 - 실제 배포 시에는 주석 처리가 필요합니다.
  const fetchCards = useCallback(async (cursor?: string | null) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // [로컬 테스트용] axios 인스턴스로 요청 - 실제 배포 시에는 주석 처리가 필요합니다.
      const params: Record<string, string> = { limit: '30' };
      if (cursor) params.cursor = cursor;
      const { data: json } = await api.get('/api/v1/cards', { params });

      /* [실제 배포용] fetch 방식 - 배포 시 아래 주석을 해제하고 위 axios 코드를 주석 처리하세요.
      const token = await getAuthToken();
      let url = `${API_HOST}/api/v1/cards?limit=30`;
      if (cursor) url += `&cursor=${cursor}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      */

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
  }, [getAuthToken]);

  // --- 카드 상세 조회 ---
  // [로컬 테스트용] api(axios) 사용 - 실제 배포 시에는 주석 처리가 필요합니다.
  const fetchCardDetail = useCallback(async (cardId: number) => {
    setIsDetailLoading(true);
    try {
      // [로컬 테스트용] axios 인스턴스로 요청 - 실제 배포 시에는 주석 처리가 필요합니다.
      const { data: json } = await api.get(`/api/v1/cards/${cardId}`);

      /* [실제 배포용] fetch 방식 - 배포 시 아래 주석을 해제하고 위 axios 코드를 주석 처리하세요.
      const token = await getAuthToken();
      const res = await fetch(`${API_HOST}/api/v1/cards/${cardId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      */

      if (json.isSuccess && json.data) {
        setSelectedDetail(json.data);
      }
    } catch (err) {
      console.error("카드 상세 조회 실패:", err);
    } finally {
      setIsDetailLoading(false);
    }
  }, [getAuthToken]);

  // --- 초기 로드 ---
  useEffect(() => {
    fetchCards();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 카드 클릭 ---
  const handleCardClick = useCallback((cardId: number) => {
    setSelectedCardId(cardId);
    fetchCardDetail(cardId);
  }, [fetchCardDetail]);

  // --- 정렬 로직 ---
  const sortedCards = useMemo(() => {
    const result = [...cards];
    result.sort((a, b) => {
      // 1차: 등급순 (S > A > B > C > D)
      const gradeDiff = (GRADE_RANK[b.grade] || 0) - (GRADE_RANK[a.grade] || 0);
      if (gradeDiff !== 0) return gradeDiff;

      // 2차: 스킬값
      if (capacitySort === "ALL") {
        return getTotalSkillValue(b) - getTotalSkillValue(a);
      } else {
        return getSkillValue(b, capacitySort) - getSkillValue(a, capacitySort);
      }
    });
    return result;
  }, [cards, capacitySort]);

  // --- 선택된 카드의 리스트 데이터 ---
  const selectedListCard = useMemo(() => {
    return cards.find(c => c.cardId === selectedCardId) || null;
  }, [cards, selectedCardId]);

  // --- 스크롤 관련 상태 ---
  const [scrollRatio, setScrollRatio] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartRatioRef = useRef(0);

  const ROW_HEIGHT = 210 + 12;
  const VISIBLE_ROWS = 2.8;
  const totalRows = Math.ceil(sortedCards.length / 3);
  const totalContentHeight = totalRows * ROW_HEIGHT + 32;
  const visibleHeight = VISIBLE_ROWS * ROW_HEIGHT;
  const maxScroll = Math.max(0, totalContentHeight - visibleHeight);
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
  }, [sortedCards]);

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

  return (
    <div className="cardlist-page-container">

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
            <NineSliceBox src="/assets/008/questInf_000.png" slice={[121, 248, 85, 248]} framePadding={24} borderScale={0.5} className="cardlist-left-box">
              <div className="cardlist-grid-wrapper" onWheel={handleWheel} style={{ height: visibleHeight }}>
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
                          onClick={() => handleCardClick(card.cardId)}
                        >
                          <img src={card.imageUrl} alt={card.name} draggable={false} />
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
            {selectedListCard ? (
              <div className="cardlist-detail-split animate-detail" key={selectedListCard.cardId}>
                {/* 큰 카드 이미지 */}
                <div className="cardlist-big-card-col">
                  <img src={selectedListCard.imageUrl} alt={selectedListCard.name} draggable={false} />
                </div>

                {/* 우측 정보 */}
                <div className="cardlist-info-col">
                  {/* 이름 + 등급 + 강화 */}
                  <NineSliceBox src="/assets/008/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="cardlist-info-panel cardlist-info-header-box">
                    <div className="cardlist-info-header-text">
                      {selectedListCard.name}({selectedListCard.grade}등급)
                      {selectedDetail && ` +${selectedDetail.enhanceLevel}`}
                    </div>
                  </NineSliceBox>

                  {/* 능력치 */}
                  <NineSliceBox src="/assets/008/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="cardlist-info-panel cardlist-info-stats-box">
                    <div className="cardlist-info-title">능력치</div>
                    <div className="cardlist-info-text">{selectedListCard.skill1.skillType} +{selectedListCard.skill1.value}</div>
                    <div className="cardlist-info-text">{selectedListCard.skill2.skillType} +{selectedListCard.skill2.value}</div>
                    <div className="cardlist-info-text">{selectedListCard.skill3.skillType} +{selectedListCard.skill3.value}</div>
                  </NineSliceBox>

                  {/* 특수 능력 */}
                  <NineSliceBox src="/assets/008/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={18} borderScale={0.35} className="cardlist-info-panel cardlist-s-grade-desc" style={{ flex: 1, justifyContent: 'flex-start' }}>
                    {selectedListCard.specialAbility ? (
                      <div className="cardlist-info-text" style={{ textAlign: 'left' }}>
                        능력 : {selectedListCard.specialAbility}
                      </div>
                    ) : (
                      <div className="cardlist-info-text" style={{ textAlign: 'left', color: '#888' }}>
                        특수 능력 없음
                      </div>
                    )}
                  </NineSliceBox>
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
