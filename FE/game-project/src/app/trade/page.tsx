"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUserStore } from "@/store/useUserStore";
import { useGameStore } from "@/store/useGameStore";
import api from "@/lib/axios";
// useTrade (직접 온체인 호출) 제거 — BE가 비동기로 블록체인 처리
import { sendGAEvent } from "@/lib/gtag";
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

function normalizeSkillType(type: string): string {
  const upper = type.toUpperCase();
  return upper === 'DEV' || upper === 'DEVOPS' ? 'DEVOPS' : upper;
}

function getSkillIcon(type: string): string {
  return `${ASSET_BASE}/assets/003-01/${normalizeSkillType(type).toLowerCase()}.webp`;
}

const SKILL_ICON_STYLE: React.CSSProperties = { height: '1em', width: 'auto', verticalAlign: 'middle', imageRendering: 'pixelated', display: 'inline-block' };

function formatPrice(gold: number): string {
  if (gold >= 1000) return `${(gold / 1000).toFixed(gold % 1000 === 0 ? 0 : 1)}K`;
  return gold.toString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "~~";
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── 타입 정의 ──
interface TradeCardSkill { skillType: string; value: number; }
interface TradeListing {
  listingId: number; cardId: number; grade: string; name: string; imageUrl: string;
  skill1: TradeCardSkill; skill2: TradeCardSkill; skill3: TradeCardSkill;
  price: number; sellerNickname?: string; enhanceLevel: number; remainEnhanceCount: number;
  tokenId?: number;
}
interface MyCardItem {
  userCardId: number; cardId?: number; grade: string; name: string; imageUrl: string;
  skill1: TradeCardSkill; skill2: TradeCardSkill; skill3: TradeCardSkill;
  enhanceLevel: number; remainEnhanceCount: number;
}
type HistoryStatus = "판매중" | "판매완료" | "기간종료" | "구매완료";

// BE MarketItemStatus(영문) → FE 한글 표시 변환
function mapHistoryStatus(beStatus: string): HistoryStatus {
  const s = (beStatus ?? "").toUpperCase();
  if (s === "SALE_PENDING" || s === "ON_SALE") return "판매중";
  if (s === "SOLD" || s === "SELL_COMPLETED" || s === "SALE_COMPLETE") return "판매완료";
  if (s === "EXPIRED" || s === "SALE_EXPIRED") return "기간종료";
  if (s === "BUY_PENDING" || s === "BUY_COMPLETED" || s === "BUY_COMPLETE") return "구매완료";
  // historyType 기반 fallback
  if (s === "SELL_REGISTERED") return "판매중";
  return "판매중"; // 알 수 없는 값은 기본값
}

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
  const [sellStep, setSellStep] = useState("");
  const [buyStep, setBuyStep] = useState("");
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

  // ── 구매 목록 fetch ──
  const fetchListings = useCallback(async () => {
    setIsBuyLoading(true);
    try {
      const token = await getToken();
      const params: Record<string, string> = {};
      if (skillFilter !== "ALL") params.skillType = skillFilter === 'DEV' ? 'DEVOPS' : skillFilter;
      if (minStat) params.minStat = minStat;
      if (maxStat) params.maxStat = maxStat;
      const { data } = await api.get("/api/v1/market/items", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      if (data.success) {
        // BE 응답 필드 매핑: marketItemId→listingId, cardName→name, priceCoin→price
        const raw: any[] = data.data?.items ?? data.data ?? [];
        const result: TradeListing[] = raw.map(item => ({
          listingId: item.marketItemId ?? item.listingId,
          cardId: item.userCardId ?? item.cardId,
          grade: item.grade,
          name: item.cardName ?? item.name,
          imageUrl: item.imageUrl,
          skill1: { skillType: item.skill1?.skillType, value: item.skill1?.value },
          skill2: { skillType: item.skill2?.skillType, value: item.skill2?.value },
          skill3: { skillType: item.skill3?.skillType, value: item.skill3?.value },
          price: item.priceCoin ?? item.price,
          enhanceLevel: item.enhanceSuccessCount ?? item.enhanceLevel ?? 0,
          remainEnhanceCount: item.enhanceTryCount ?? item.remainEnhanceCount ?? 0,
        }));
        setListings(result);
        setSelectedListing(prev => prev ?? (result[0] ?? null));
      }
    } catch {
      setListings([]);
      setSelectedListing(null);
    } finally {
      setIsBuyLoading(false);
    }
  }, [getToken, skillFilter, minStat, maxStat]);

  // ── 내 카드 목록 fetch ──
  const fetchMyCards = useCallback(async () => {
    setIsSellLoading(true);
    try {
      const token = await getToken();
      const { data } = await api.get("/api/v1/market/my/sellable-cards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        const raw: any[] = data.data?.items ?? data.data ?? [];
        const cards: MyCardItem[] = raw.map(item => ({
          userCardId: item.userCardId,
          cardId: item.cardTemplateId,
          grade: item.grade,
          name: item.cardName ?? item.name,
          imageUrl: item.imageUrl,
          skill1: { skillType: item.skill1?.skillType, value: item.skill1?.value },
          skill2: { skillType: item.skill2?.skillType, value: item.skill2?.value },
          skill3: { skillType: item.skill3?.skillType, value: item.skill3?.value },
          enhanceLevel: item.enhanceSuccessCount ?? 0,
          remainEnhanceCount: item.enhanceTryCount ?? 0,
        }));
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
      const { data } = await api.get("/api/v1/market/my/histories", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      if (data.success) {
        const raw: any[] = data.data?.histories ?? data.data ?? [];
        const result: HistoryItem[] = raw.map(item => ({
          historyId: item.marketTradeHistoryId ?? item.historyId,
          grade: item.grade,
          cardName: item.cardName,
          imageUrl: item.imageUrl,
          skill1: { skillType: item.skill1?.skillType, value: item.skill1?.value },
          skill2: { skillType: item.skill2?.skillType, value: item.skill2?.value },
          skill3: { skillType: item.skill3?.skillType, value: item.skill3?.value },
          price: item.priceCoin ?? item.price,
          status: mapHistoryStatus(item.status ?? item.historyType ?? ""),
          enhanceLevel: item.enhanceSuccessCount ?? item.enhanceLevel ?? 0,
          remainEnhanceCount: item.enhanceTryCount ?? item.remainEnhanceCount ?? 0,
          completedAt: item.completedAt ?? null,
          expiresAt: item.expiresAt ?? null,
          registeredAt: item.eventAt ?? item.createdAt ?? item.registeredAt,
        }));
        setHistory(result);
        setSelectedHistItem(prev => prev ?? (result[0] ?? null));
      }
    } catch {
      setHistory([]);
      setSelectedHistItem(null);
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
  }, [tab, fetchListings, fetchMyCards, fetchHistory]);

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
      // BE API 호출 (BE가 비동기로 블록체인 처리)
      const token = await getToken();
      await api.post(`/api/v1/market/items/${selectedListing.listingId}/buy`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedListing(null);
      setBuyStep("");
      fetchListings();
    } catch (e: any) {
      setBuyStep("");
      useGameStore.getState().openComingSoonModal((e as any)?.response?.data?.error?.message ?? "구매 중 오류가 발생했습니다.");
    } finally {
      setIsBuying(false);
    }
  };

  // ── 판매 등록 ──
  const handleSell = async () => {
    if (!selectedMyCard || !sellPrice) return;
    const price = parseInt(sellPrice, 10);
    if (isNaN(price) || price <= 0) { useGameStore.getState().openComingSoonModal("올바른 가격을 입력해주세요."); return; }
    setIsSelling(true);
    try {
      // BE API 호출 (BE가 비동기로 블록체인 처리)
      const token = await getToken();
      await api.post("/api/v1/market/items", {
        userCardId: selectedMyCard.userCardId,
        priceCoin: price,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSellStep("");
      setSellPrice("");
      setSelectedMyCard(null);
      fetchMyCards();
      useGameStore.getState().openComingSoonModal("판매 등록 중입니다. 처리 완료 후 목록에 표시됩니다.");
    } catch (e: any) {
      setSellStep("");
      useGameStore.getState().openComingSoonModal((e as any)?.response?.data?.error?.message ?? "판매 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSelling(false);
    }
  };

  // 판매 탭 필터링된 카드 — BE가 /sellable-cards에서 이미 판매 가능 카드만 리턴하므로 등급 필터 불필요
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
        <span className="trade-right-card-stat stat-1"><img src={getSkillIcon(skill1.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(skill1.skillType)} {skill1.value}</span>
        <span className="trade-right-card-stat stat-2"><img src={getSkillIcon(skill2.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(skill2.skillType)} {skill2.value}</span>
        <span className="trade-right-card-stat stat-3"><img src={getSkillIcon(skill3.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(skill3.skillType)} {skill3.value}</span>
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
              {isBuying ? (buyStep || "구매 중...") : "구매하기"}
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
                    <span className="trade-card-stat stat-1"><img src={getSkillIcon(card.skill1.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                    <span className="trade-card-stat stat-2"><img src={getSkillIcon(card.skill2.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                    <span className="trade-card-stat stat-3"><img src={getSkillIcon(card.skill3.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
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
            <div className="trade-sell-bottom-row">
              <div className="trade-price-set-box">
                <span className="trade-price-set-label">판매 가격 (골드)</span>
                <input
                  className="trade-price-set-input"
                  type="number" min="1" placeholder="가격 입력"
                  value={sellPrice}
                  onChange={e => setSellPrice(e.target.value)}
                />
              </div>
              <button className="trade-sell-btn" onClick={handleSell} disabled={isSelling || !sellPrice}>
                {isSelling ? (sellStep || "등록 중...") : "판매 등록"}
              </button>
            </div>
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
                {isBuying ? (buyStep || "구매 중...") : "구매하기"}
              </button>
              <button className="trade-modal-btn-cancel" onClick={() => setShowBuyConfirm(false)}>돌아가기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
