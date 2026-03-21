"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUserStore } from "@/store/useUserStore";
import { useGameStore } from "@/store/useGameStore";
import api from "@/lib/axios";
import "./trade.css";

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ── NineSliceBox ──
interface NineSliceBoxProps {
  src: string;
  slice: [number, number, number, number];
  framePadding: number;
  borderScale?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
function NineSliceBox({ src, slice, framePadding, borderScale = 1, children, className, style }: NineSliceBoxProps) {
  const t = Math.round(slice[0] * borderScale);
  const r = Math.round(slice[1] * borderScale);
  const b = Math.round(slice[2] * borderScale);
  const l = Math.round(slice[3] * borderScale);
  return (
    <div className={`relative ${className || ""}`} style={{ padding: `${framePadding}px`, boxSizing: "border-box", ...style }}>
      <div style={{
        position: "absolute", top: -(t - framePadding), right: -(r - framePadding),
        bottom: -(b - framePadding), left: -(l - framePadding),
        borderStyle: "solid", borderWidth: `${t}px ${r}px ${b}px ${l}px`,
        borderImageSource: `url(${src})`,
        borderImageSlice: `${slice[0]} ${slice[1]} ${slice[2]} ${slice[3]} fill`,
        borderColor: "transparent", imageRendering: "pixelated",
        transform: "translateZ(0) scale(1.0001)", zIndex: 0, pointerEvents: "none",
      } as React.CSSProperties} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

function displaySkillType(type: string): string {
  return type.toUpperCase() === "DEVOPS" ? "DEV" : type.toUpperCase();
}

function formatPrice(gold: number): string {
  if (gold >= 1000) return `${(gold / 1000).toFixed(gold % 1000 === 0 ? 0 : 1)}K`;
  return gold.toString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "~~";
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── 샘플 데이터 ──
const SAMPLE_LISTINGS: TradeListing[] = [
  {
    listingId: 1, cardId: 1, grade: "S", name: "싸피생1",
    imageUrl: "/assets/008/SCardImage_000.webp",
    skill1: { skillType: "BE", value: 99 }, skill2: { skillType: "FE", value: 99 }, skill3: { skillType: "AI", value: 80 },
    price: 150000, sellerNickname: "판매자A", enhanceLevel: 2, remainEnhanceCount: 3,
  },
  {
    listingId: 2, cardId: 2, grade: "A", name: "싸피생2",
    imageUrl: "/assets/008/SCardImage_001.webp",
    skill1: { skillType: "BE", value: 99 }, skill2: { skillType: "FE", value: 80 }, skill3: { skillType: "AI", value: 99 },
    price: 200000, sellerNickname: "판매자B", enhanceLevel: 0, remainEnhanceCount: 5,
  },
  {
    listingId: 3, cardId: 3, grade: "A", name: "싸피생3",
    imageUrl: "/assets/008/SCardImage_002.webp",
    skill1: { skillType: "BE", value: 80 }, skill2: { skillType: "FE", value: 99 }, skill3: { skillType: "AI", value: 99 },
    price: 300000, sellerNickname: "판매자C", enhanceLevel: 1, remainEnhanceCount: 4,
  },
];

const SAMPLE_HISTORY: HistoryItem[] = [
  {
    historyId: 1, status: "판매중",
    cardName: "싸피생1", grade: "S", imageUrl: "/assets/008/SCardImage_000.webp",
    skill1: { skillType: "BE", value: 99 }, skill2: { skillType: "FE", value: 99 }, skill3: { skillType: "AI", value: 80 },
    enhanceLevel: 2, remainEnhanceCount: 3, price: 150000,
    completedAt: null, expiresAt: "2026-04-01T00:00:00Z", registeredAt: "2026-03-20T10:00:00Z",
  },
  {
    historyId: 2, status: "판매완료",
    cardName: "싸피생2", grade: "A", imageUrl: "/assets/008/SCardImage_001.webp",
    skill1: { skillType: "BE", value: 99 }, skill2: { skillType: "FE", value: 80 }, skill3: { skillType: "AI", value: 99 },
    enhanceLevel: 0, remainEnhanceCount: 5, price: 200000,
    completedAt: "2026-03-21T15:30:00Z", expiresAt: "2026-03-25T00:00:00Z", registeredAt: "2026-03-19T09:00:00Z",
  },
  {
    historyId: 3, status: "구매완료",
    cardName: "싸피생3", grade: "A", imageUrl: "/assets/008/SCardImage_002.webp",
    skill1: { skillType: "BE", value: 80 }, skill2: { skillType: "FE", value: 99 }, skill3: { skillType: "AI", value: 99 },
    enhanceLevel: 1, remainEnhanceCount: 4, price: 300000,
    completedAt: "2026-03-20T12:00:00Z", expiresAt: null, registeredAt: "2026-03-18T08:00:00Z",
  },
];

// ── 타입 정의 ──
interface TradeCardSkill { skillType: string; value: number; }
interface TradeListing {
  listingId: number; cardId: number; grade: string; name: string; imageUrl: string;
  skill1: TradeCardSkill; skill2: TradeCardSkill; skill3: TradeCardSkill;
  price: number; sellerNickname: string; enhanceLevel: number; remainEnhanceCount: number;
}
interface MyCardItem {
  cardId: number; grade: string; name: string; imageUrl: string;
  skill1: TradeCardSkill; skill2: TradeCardSkill; skill3: TradeCardSkill;
  enhanceLevel: number; remainEnhanceCount: number;
}
type HistoryStatus = "판매중" | "판매완료" | "기간종료" | "구매완료";
interface HistoryItem {
  historyId: number; status: HistoryStatus; cardName: string; grade: string; imageUrl: string;
  skill1: TradeCardSkill; skill2: TradeCardSkill; skill3: TradeCardSkill;
  enhanceLevel: number; remainEnhanceCount: number; price: number;
  completedAt: string | null; expiresAt: string | null; registeredAt: string;
}

type TabType = "BUY" | "SELL" | "HISTORY";
const SKILL_FILTERS = ["ALL", "BE", "FE", "AI", "DBA", "DEV", "DESIGN"] as const;

// ── 스크롤 훅 ──
function useCustomScroll(contentHeight: number, wrapperHeight: number) {
  const [scrollRatio, setScrollRatio] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartRatioRef = useRef(0);
  const swipeStartYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const swipeMovedRef = useRef(false);
  const swipeVelocityRef = useRef(0);
  const swipeLastTimeRef = useRef(0);
  const momentumRef = useRef<number | null>(null);

  const maxScroll = Math.max(0, contentHeight - wrapperHeight);
  const scrollOffset = scrollRatio * maxScroll;

  const getThumbTop = useCallback(() => {
    if (!trackRef.current) return 14;
    const trackH = trackRef.current.clientHeight;
    const pad = 14; const thumbH = 100;
    const maxTop = trackH - thumbH - pad * 2;
    if (maxTop <= 0) return pad;
    return pad + scrollRatio * maxTop;
  }, [scrollRatio]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (maxScroll <= 0) return;
    setScrollRatio(p => Math.min(1, Math.max(0, p + e.deltaY / maxScroll * 0.7)));
  }, [maxScroll]);

  const handleThumbDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartRatioRef.current = scrollRatio;
  }, [scrollRatio]);

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pad = 14; const thumbH = 100;
    const maxTop = rect.height - thumbH - pad * 2;
    if (maxTop <= 0) return;
    const adj = e.clientY - rect.top - pad;
    setScrollRatio(Math.min(1, Math.max(0, (adj - thumbH / 2) / maxTop)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !trackRef.current) return;
      const trackH = trackRef.current.clientHeight;
      const maxTop = trackH - 100 - 28;
      if (maxTop <= 0) return;
      const delta = e.clientY - dragStartYRef.current;
      setScrollRatio(Math.min(1, Math.max(0, dragStartRatioRef.current + delta / maxTop)));
    };
    const onUp = () => { isDraggingRef.current = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, []);

  const swipeHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (maxScroll <= 0) return;
      if (momentumRef.current) { cancelAnimationFrame(momentumRef.current); momentumRef.current = null; }
      isSwipingRef.current = true; swipeMovedRef.current = false;
      swipeStartYRef.current = e.clientY; swipeVelocityRef.current = 0;
      swipeLastTimeRef.current = performance.now();
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!isSwipingRef.current || maxScroll <= 0) return;
      const now = performance.now();
      const dt = Math.max(8, now - swipeLastTimeRef.current);
      const scale = parseFloat(document.documentElement.style.getPropertyValue("--game-scale")) || 1;
      const raw = swipeStartYRef.current - e.clientY;
      if (Math.abs(raw) > 2) swipeMovedRef.current = true;
      swipeVelocityRef.current = raw * (16 / dt);
      swipeStartYRef.current = e.clientY; swipeLastTimeRef.current = now;
      setScrollRatio(p => Math.min(1, Math.max(0, p + (raw / scale) / maxScroll)));
    },
    onPointerUp: () => {
      if (!isSwipingRef.current) return;
      isSwipingRef.current = false;
      const capMax = maxScroll;
      const scale = parseFloat(document.documentElement.style.getPropertyValue("--game-scale")) || 1;
      let v = swipeVelocityRef.current / scale;
      const animate = () => {
        v *= 0.9;
        if (Math.abs(v) < 0.3 || capMax <= 0) { momentumRef.current = null; swipeMovedRef.current = false; return; }
        setScrollRatio(p => Math.min(1, Math.max(0, p + v / capMax)));
        momentumRef.current = requestAnimationFrame(animate);
      };
      if (Math.abs(v) > 0.5) { momentumRef.current = requestAnimationFrame(animate); } else { swipeMovedRef.current = false; }
    },
    onPointerCancel: () => {
      isSwipingRef.current = false; swipeMovedRef.current = false;
      if (momentumRef.current) { cancelAnimationFrame(momentumRef.current); momentumRef.current = null; }
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (swipeMovedRef.current) { e.stopPropagation(); swipeMovedRef.current = false; }
    },
  };

  return { scrollRatio, setScrollRatio, scrollOffset, maxScroll, trackRef, wrapperRef, getThumbTop, handleWheel, handleThumbDown, handleTrackClick, swipeHandlers };
}

// ══════════════════════════════════════════
export default function TradePage() {
  const { getAccessToken } = usePrivy();
  const { accessToken } = useUserStore();
  const { coffee } = useGameStore();
  const [tab, setTab] = useState<TabType>("BUY");

  // ── 구매 탭 상태 ──
  const [listings, setListings] = useState<TradeListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<TradeListing | null>(null);
  const [skillFilter, setSkillFilter] = useState("ALL");
  const [minStat, setMinStat] = useState("");
  const [maxStat, setMaxStat] = useState("");
  const [isBuyLoading, setIsBuyLoading] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [buyListHeight, setBuyListHeight] = useState(0);
  const [buyWrapHeight, setBuyWrapHeight] = useState(0);
  const buyListRef = useRef<HTMLDivElement>(null);
  const buyScroll = useCustomScroll(buyListHeight, buyWrapHeight);

  // ── 판매 탭 상태 ──
  const [myCards, setMyCards] = useState<MyCardItem[]>([]);
  const [selectedMyCard, setSelectedMyCard] = useState<MyCardItem | null>(null);
  const [sellSkillFilter, setSellSkillFilter] = useState("ALL");
  const [sellPrice, setSellPrice] = useState("");
  const [isSellLoading, setIsSellLoading] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [sellGridHeight, setSellGridHeight] = useState(0);
  const [sellWrapHeight, setSellWrapHeight] = useState(0);
  const sellGridRef = useRef<HTMLDivElement>(null);
  const sellScroll = useCustomScroll(sellGridHeight, sellWrapHeight);

  // ── 거래 내역 탭 상태 ──
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [histStatusFilter, setHistStatusFilter] = useState<HistoryStatus | "ALL">("ALL");
  const [selectedHistItem, setSelectedHistItem] = useState<HistoryItem | null>(null);
  const [histListHeight, setHistListHeight] = useState(0);
  const [histWrapHeight, setHistWrapHeight] = useState(0);
  const histListRef = useRef<HTMLDivElement>(null);
  const histScroll = useCustomScroll(histListHeight, histWrapHeight);

  const getToken = useCallback(async () => accessToken || await getAccessToken(), [accessToken, getAccessToken]);

  // 샘플 데이터 클라이언트 필터링
  const filterSampleListings = useCallback((items: TradeListing[]) => {
    return items.filter(item => {
      if (skillFilter === "ALL") return true;
      const matchingSkill = [item.skill1, item.skill2, item.skill3].find(s =>
        displaySkillType(s.skillType) === skillFilter || s.skillType.toUpperCase() === skillFilter
      );
      if (!matchingSkill) return false;
      const min = minStat ? parseInt(minStat) : 0;
      const max = maxStat ? parseInt(maxStat) : 9999;
      return matchingSkill.value >= min && matchingSkill.value <= max;
    });
  }, [skillFilter, minStat, maxStat]);

  // ── 구매 목록 fetch ──
  const fetchListings = useCallback(async () => {
    setIsBuyLoading(true);
    try {
      const token = await getToken();
      const params: Record<string, string> = {};
      if (skillFilter !== "ALL") params.skillType = skillFilter;
      if (minStat) params.minStat = minStat;
      if (maxStat) params.maxStat = maxStat;
      const { data } = await api.get("/api/v1/trade/listings", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      if (data.success) {
        const result: TradeListing[] = data.data ?? [];
        const final = result.length > 0 ? result : filterSampleListings(SAMPLE_LISTINGS);
        setListings(final);
        setSelectedListing(prev => prev ?? (final[0] ?? null));
      }
    } catch {
      const filtered = filterSampleListings(SAMPLE_LISTINGS);
      setListings(filtered);
      setSelectedListing(prev => prev ?? (filtered[0] ?? null));
    } finally {
      setIsBuyLoading(false);
    }
  }, [getToken, skillFilter, minStat, maxStat, filterSampleListings]);

  // ── 내 카드 목록 fetch ──
  const fetchMyCards = useCallback(async () => {
    setIsSellLoading(true);
    try {
      const token = await getToken();
      const { data } = await api.get("/api/v1/cards", {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: "100" },
      });
      if (data.success) {
        const cards: MyCardItem[] = data.data?.cards ?? [];
        setMyCards(cards);
        setSelectedMyCard(cards[0] ?? null);
      }
    } catch {
      setMyCards([]);
    } finally {
      setIsSellLoading(false);
    }
  }, [getToken]);

  // ── 거래 내역 fetch ──
  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const token = await getToken();
      const params: Record<string, string> = {};
      if (histStatusFilter !== "ALL") params.status = histStatusFilter;
      const { data } = await api.get("/api/v1/trade/history", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      if (data.success) {
        const result: HistoryItem[] = data.data ?? [];
        const final = result.length > 0 ? result : SAMPLE_HISTORY;
        setHistory(final);
        setSelectedHistItem(prev => prev ?? (final[0] ?? null));
      }
    } catch {
      setHistory(SAMPLE_HISTORY);
      setSelectedHistItem(prev => prev ?? (SAMPLE_HISTORY[0] ?? null));
    } finally {
      setIsHistoryLoading(false);
    }
  }, [getToken, histStatusFilter]);

  useEffect(() => {
    if (tab === "BUY") fetchListings();
    else if (tab === "SELL") fetchMyCards();
    else fetchHistory();
    setSelectedListing(null);
    setSelectedMyCard(null);
    setSelectedHistItem(null);
  }, [tab]);

  // DOM 높이 측정
  useEffect(() => {
    const measure = () => {
      if (buyListRef.current) setBuyListHeight(buyListRef.current.scrollHeight);
      if (buyScroll.wrapperRef.current) setBuyWrapHeight(buyScroll.wrapperRef.current.clientHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 100);
    return () => { window.removeEventListener("resize", measure); clearTimeout(t); };
  }, [listings]);

  useEffect(() => {
    const measure = () => {
      if (sellGridRef.current) setSellGridHeight(sellGridRef.current.scrollHeight);
      if (sellScroll.wrapperRef.current) setSellWrapHeight(sellScroll.wrapperRef.current.clientHeight);
    };
    measure();
    const t = setTimeout(measure, 100);
    return () => clearTimeout(t);
  }, [myCards, sellSkillFilter]);

  useEffect(() => {
    const measure = () => {
      if (histListRef.current) setHistListHeight(histListRef.current.scrollHeight);
      if (histScroll.wrapperRef.current) setHistWrapHeight(histScroll.wrapperRef.current.clientHeight);
    };
    measure();
    const t = setTimeout(measure, 100);
    return () => clearTimeout(t);
  }, [history]);

  // ── 구매 클릭: 커피 잔액 확인 후 모달 ──
  const handleBuyClick = () => {
    if (!selectedListing) return;
    if ((coffee ?? 0) < selectedListing.price) {
      setShowInsufficientModal(true);
    } else {
      setShowBuyConfirm(true);
    }
  };

  // ── 구매 실행 ──
  const handleBuyConfirm = async () => {
    setShowBuyConfirm(false);
    if (!selectedListing) return;
    setIsBuying(true);
    try {
      const token = await getToken();
      await api.post(`/api/v1/trade/listings/${selectedListing.listingId}/buy`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedListing(null);
      fetchListings();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? "구매 중 오류가 발생했습니다.");
    } finally {
      setIsBuying(false);
    }
  };

  // ── 판매 등록 ──
  const handleSell = async () => {
    if (!selectedMyCard || !sellPrice) return;
    const price = parseInt(sellPrice, 10);
    if (isNaN(price) || price <= 0) { alert("올바른 가격을 입력해주세요."); return; }
    setIsSelling(true);
    try {
      const token = await getToken();
      await api.post("/api/v1/trade/listings", {
        cardId: selectedMyCard.cardId, price,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSellPrice("");
      setSelectedMyCard(null);
      fetchMyCards();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? "판매 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSelling(false);
    }
  };

  // 판매 탭 필터링된 카드
  const filteredMyCards = myCards.filter(card => {
    if (sellSkillFilter === "ALL") return true;
    return [card.skill1, card.skill2, card.skill3].some(s =>
      displaySkillType(s.skillType) === sellSkillFilter || s.skillType.toUpperCase() === sellSkillFilter
    );
  });

  // 거래 내역 클라이언트 필터링
  const displayedHistory = histStatusFilter === "ALL"
    ? history
    : history.filter(h => h.status === histStatusFilter);

  // 우측 카드 이미지 + 능력치 오버레이 (카드목록 페이지 동일 방식)
  const renderCardWithStats = (
    imageUrl: string,
    name: string,
    skill1: TradeCardSkill,
    skill2: TradeCardSkill,
    skill3: TradeCardSkill
  ) => (
    <div className="trade-right-card-area">
      <div className="trade-right-card-wrapper">
        <img className="trade-right-card-img" src={imageUrl} alt={name} draggable={false} />
        <span className="trade-right-card-stat stat-1">{displaySkillType(skill1.skillType)} {skill1.value}</span>
        <span className="trade-right-card-stat stat-2">{displaySkillType(skill2.skillType)} {skill2.value}</span>
        <span className="trade-right-card-stat stat-3">{displaySkillType(skill3.skillType)} {skill3.value}</span>
      </div>
    </div>
  );

  // ── 구매 탭 렌더 ──
  const renderBuyTab = () => (
    <>
      <div className="trade-left-col">
        {/* 기술스택 + 능력치 범위 필터 */}
        <div className="trade-filters">
          <div className="trade-select-wrapper">
            <select className="trade-select" value={skillFilter} onChange={e => setSkillFilter(e.target.value)}>
              {SKILL_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <span className="trade-filter-label">능력치</span>
          <input className="trade-price-input" placeholder="최소" value={minStat} onChange={e => setMinStat(e.target.value)} type="number" min="0" max="999" />
          <span className="trade-price-sep">~</span>
          <input className="trade-price-input" placeholder="최대" value={maxStat} onChange={e => setMaxStat(e.target.value)} type="number" min="0" max="999" />
          <button className="trade-search-btn" onClick={fetchListings}>검색</button>
        </div>

        <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={16} borderScale={0.5} className="trade-list-box">
          <div className="trade-list-wrapper" ref={buyScroll.wrapperRef} onWheel={buyScroll.handleWheel} {...buyScroll.swipeHandlers}>
            <div className="trade-list-inner" ref={buyListRef} style={{ transform: `translateY(-${buyScroll.scrollOffset}px)` }}>
              {isBuyLoading ? (
                <div className="trade-empty">불러오는 중...</div>
              ) : listings.length === 0 ? (
                <div className="trade-empty">거래 목록이 없습니다</div>
              ) : (
                listings.map(item => (
                  <div
                    key={item.listingId}
                    className={`trade-item-row ${selectedListing?.listingId === item.listingId ? "selected" : ""}`}
                    onClick={() => setSelectedListing(item)}
                  >
                    <img className="trade-item-thumb" src={item.imageUrl} alt={item.name} draggable={false} />
                    <div className="trade-item-info">
                      <div className="trade-item-name">카드 이름 : {item.name}</div>
                      <div className="trade-item-stats">
                        능력치 : {displaySkillType(item.skill1.skillType)} {item.skill1.value} / {displaySkillType(item.skill2.skillType)} {item.skill2.value} / {displaySkillType(item.skill3.skillType)} {item.skill3.value}
                      </div>
                    </div>
                    <div className="trade-item-price-box">
                      <div className="trade-item-price-label">가격</div>
                      <div className="trade-item-price-value">{formatPrice(item.price)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </NineSliceBox>
      </div>

      <div className="trade-scrollbar-column">
        <div ref={buyScroll.trackRef} className="scrollbar-track" onClick={buyScroll.handleTrackClick}>
          <div className="scrollbar-thumb" style={{ top: buyScroll.getThumbTop() }} onPointerDown={buyScroll.handleThumbDown} />
        </div>
      </div>

      {/* 우측 상세 */}
      <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={16} borderScale={0.5} className="trade-right-box">
        <div className="trade-token-row">
          <img className="trade-token-icon" src={`${ASSET_BASE}/assets/002/coffee_002.webp`} alt="coffee" />
          <span className="trade-token-text">소지 커피 {(coffee ?? 0).toLocaleString()}잔</span>
        </div>

        {selectedListing ? (
          <div className="trade-right-inner" style={{ marginTop: "20px" }}>
            {renderCardWithStats(selectedListing.imageUrl, selectedListing.name, selectedListing.skill1, selectedListing.skill2, selectedListing.skill3)}
            <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={12} borderScale={0.35} className="trade-right-info-box">
              <div className="trade-right-info-text">
                {selectedListing.name}({selectedListing.grade}등급/+{selectedListing.enhanceLevel})<br />
                남은 강화 횟수 : {selectedListing.remainEnhanceCount}<br />
                판매금액 : {selectedListing.price.toLocaleString()}
              </div>
            </NineSliceBox>
            <button className="trade-buy-btn" onClick={handleBuyClick} disabled={isBuying}>
              {isBuying ? "구매 중..." : "구매하기"}
            </button>
          </div>
        ) : (
          <div className="trade-right-empty">카드를 선택해주세요</div>
        )}
      </NineSliceBox>
    </>
  );

  // ── 판매 탭 렌더 ──
  const renderSellTab = () => (
    <>
      <div className="trade-left-col">
        {/* 기술스택 필터 드롭다운 (카드목록 동일 스타일) */}
        <div className="trade-filters">
          <div className="trade-select-wrapper">
            <select
              className="trade-select"
              value={sellSkillFilter}
              onChange={e => { setSellSkillFilter(e.target.value); setSelectedMyCard(null); }}
            >
              {SKILL_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={16} borderScale={0.5} className="trade-list-box">
          <div className="trade-list-wrapper" ref={sellScroll.wrapperRef} onWheel={sellScroll.handleWheel} {...sellScroll.swipeHandlers}>
            <div className="trade-sell-grid" ref={sellGridRef} style={{ transform: `translateY(-${sellScroll.scrollOffset}px)` }}>
              {isSellLoading ? (
                <div style={{ gridColumn: "1/-1" }} className="trade-empty">불러오는 중...</div>
              ) : filteredMyCards.length === 0 ? (
                <div style={{ gridColumn: "1/-1" }} className="trade-empty">카드가 없습니다</div>
              ) : (
                filteredMyCards.map(card => (
                  <div
                    key={card.cardId}
                    className={`trade-sell-card-item ${selectedMyCard?.cardId === card.cardId ? "selected" : ""}`}
                    onClick={() => setSelectedMyCard(card)}
                  >
                    <img src={card.imageUrl} alt={card.name} draggable={false} />
                    <span className="trade-card-stat stat-1">{displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                    <span className="trade-card-stat stat-2">{displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                    <span className="trade-card-stat stat-3">{displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </NineSliceBox>
      </div>

      <div className="trade-scrollbar-column">
        <div ref={sellScroll.trackRef} className="scrollbar-track" onClick={sellScroll.handleTrackClick}>
          <div className="scrollbar-thumb" style={{ top: sellScroll.getThumbTop() }} onPointerDown={sellScroll.handleThumbDown} />
        </div>
      </div>

      {/* 우측 상세 */}
      <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={16} borderScale={0.5} className="trade-right-box">
        <div className="trade-token-row">
          <img className="trade-token-icon" src={`${ASSET_BASE}/assets/002/coffee_002.webp`} alt="coffee" />
          <span className="trade-token-text">소지 커피 {(coffee ?? 0).toLocaleString()}잔</span>
        </div>

        {selectedMyCard ? (
          <div className="trade-right-inner" style={{ marginTop: "20px" }}>
            {renderCardWithStats(selectedMyCard.imageUrl, selectedMyCard.name, selectedMyCard.skill1, selectedMyCard.skill2, selectedMyCard.skill3)}
            <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={12} borderScale={0.35} className="trade-right-info-box">
              <div className="trade-right-info-text">
                {selectedMyCard.name}({selectedMyCard.grade}등급/+{selectedMyCard.enhanceLevel})<br />
                남은 강화 횟수 : {selectedMyCard.remainEnhanceCount}
              </div>
            </NineSliceBox>
            <div className="trade-price-set-box">
              <div className="trade-price-set-inner">
                <span className="trade-price-set-label">판매 가격 (골드)</span>
                <input
                  className="trade-price-set-input"
                  type="number" min="1" placeholder="가격 입력"
                  value={sellPrice}
                  onChange={e => setSellPrice(e.target.value)}
                />
              </div>
            </div>
            <button className="trade-sell-btn" onClick={handleSell} disabled={isSelling || !sellPrice}>
              {isSelling ? "등록 중..." : "판매 등록"}
            </button>
          </div>
        ) : (
          <div className="trade-right-empty">판매할 카드를 선택해주세요</div>
        )}
      </NineSliceBox>
    </>
  );

  // ── 거래 내역 탭 렌더 ──
  const renderHistoryTab = () => (
    <>
      <div className="trade-left-col">
        {/* 상태 필터 */}
        <div className="trade-filters">
          <div className="trade-select-wrapper">
            <select
              className="trade-select"
              value={histStatusFilter}
              onChange={e => setHistStatusFilter(e.target.value as HistoryStatus | "ALL")}
            >
              <option value="ALL">전체</option>
              <option value="판매중">판매중</option>
              <option value="판매완료">판매완료</option>
              <option value="기간종료">기간종료</option>
              <option value="구매완료">구매완료</option>
            </select>
          </div>
          <button className="trade-search-btn" onClick={fetchHistory}>검색</button>
        </div>

        <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={16} borderScale={0.5} className="trade-list-box">
          <div className="trade-list-wrapper" ref={histScroll.wrapperRef} onWheel={histScroll.handleWheel} {...histScroll.swipeHandlers}>
            <div className="trade-list-inner" ref={histListRef} style={{ transform: `translateY(-${histScroll.scrollOffset}px)` }}>
              {isHistoryLoading ? (
                <div className="trade-empty">불러오는 중...</div>
              ) : displayedHistory.length === 0 ? (
                <div className="trade-empty">거래 내역이 없습니다</div>
              ) : (
                displayedHistory.map(h => (
                  <div key={h.historyId} className={`trade-item-row ${selectedHistItem?.historyId === h.historyId ? "selected" : ""}`} onClick={() => setSelectedHistItem(h)}>
                    <img className="trade-item-thumb" src={h.imageUrl} alt={h.cardName} draggable={false} />
                    <div className="trade-item-info">
                      <div className="trade-history-status-badge" data-status={h.status}>{h.status}</div>
                      <div className="trade-item-name">카드 이름 : {h.cardName}</div>
                      <div className="trade-item-stats">
                        능력치 : {displaySkillType(h.skill1.skillType)} {h.skill1.value} / {displaySkillType(h.skill2.skillType)} {h.skill2.value} / {displaySkillType(h.skill3.skillType)} {h.skill3.value}
                      </div>
                    </div>
                    <button
                      className="trade-detail-btn"
                      onClick={() => setSelectedHistItem(h)}
                    >
                      상세정보<br />보기
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </NineSliceBox>
      </div>

      <div className="trade-scrollbar-column">
        <div ref={histScroll.trackRef} className="scrollbar-track" onClick={histScroll.handleTrackClick}>
          <div className="scrollbar-thumb" style={{ top: histScroll.getThumbTop() }} onPointerDown={histScroll.handleThumbDown} />
        </div>
      </div>

      {/* 우측 상세 */}
      <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={16} borderScale={0.5} className="trade-right-box">
        {selectedHistItem ? (
          <div className="trade-right-inner" style={{ paddingTop: "30px" }}>
            {renderCardWithStats(selectedHistItem.imageUrl, selectedHistItem.cardName, selectedHistItem.skill1, selectedHistItem.skill2, selectedHistItem.skill3)}
            <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={12} borderScale={0.35} className="trade-right-info-box">
              <div className="trade-right-info-text">
                {selectedHistItem.cardName}({selectedHistItem.grade}등급/+{selectedHistItem.enhanceLevel})<br />
                남은 강화 횟수 : {selectedHistItem.remainEnhanceCount}
              </div>
            </NineSliceBox>
            <NineSliceBox src={`${ASSET_BASE}/assets/008/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={12} borderScale={0.35} className="trade-right-info-box">
              <div className="trade-right-info-text trade-right-date-text">
                판매/구매 완료 일자 : {formatDate(selectedHistItem.completedAt)}<br />
                기간 만료일자 : {formatDate(selectedHistItem.expiresAt)}<br />
                판매 등록일시 : {formatDate(selectedHistItem.registeredAt)}
              </div>
            </NineSliceBox>
          </div>
        ) : (
          <div className="trade-right-empty">내역을 선택해주세요</div>
        )}
      </NineSliceBox>
    </>
  );

  return (
    <div className="trade-page-container">
      {/* 탭 */}
      <div className="trade-tabs">
        {([["BUY", "구매"], ["SELL", "판매"], ["HISTORY", "거래 내역"]] as const).map(([key, label]) => (
          <div key={key} className="trade-tab-wrapper">
            <button className={`trade-tab-btn ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              <div className="trade-tab-inner" />
              <span>{label}</span>
            </button>
          </div>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="trade-content">
        {tab === "BUY" && renderBuyTab()}
        {tab === "SELL" && renderSellTab()}
        {tab === "HISTORY" && renderHistoryTab()}
      </div>

      {/* 잔액 부족 모달 */}
      {showInsufficientModal && (
        <div className="trade-modal-overlay">
          <div className="trade-modal-box">
            <p className="trade-modal-title">돈이 부족합니다</p>
            <button className="trade-modal-btn-ok" onClick={() => setShowInsufficientModal(false)}>확인</button>
          </div>
        </div>
      )}

      {/* 구매 확인 모달 */}
      {showBuyConfirm && selectedListing && (
        <div className="trade-modal-overlay">
          <div className="trade-modal-box">
            <p className="trade-modal-title">구매하시겠습니까?</p>
            <p className="trade-modal-sub">현재 소지한 커피는 {(coffee ?? 0).toLocaleString()}잔입니다.</p>
            <div className="trade-modal-btns">
              <button className="trade-modal-btn-buy" onClick={handleBuyConfirm} disabled={isBuying}>
                {isBuying ? "구매 중..." : "구매하기"}
              </button>
              <button className="trade-modal-btn-cancel" onClick={() => setShowBuyConfirm(false)}>돌아가기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
