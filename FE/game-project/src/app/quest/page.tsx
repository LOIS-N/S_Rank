"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import "./quest.css";

const API_HOST = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// --- API 응답 인터페이스 ---
interface MainQuestData {
  questId: number;
  questType: string;
  chapterNo: number;
  stepNo: number;
  title: string;
  description: string;
  difficulty: number;
  requiredSkillType1: string;
  requiredSkillValue1: number;
  requiredSkillType2: string;
  requiredSkillValue2: number;
  requiredSkillType3: string;
  requiredSkillValue3: number;
  durationMinutes: number;
  cardSlotCount: number;
  rewardGold: number;
  status: string;
}

interface SubQuestData {
  questId: number;
  title: string;
  description: string;
  difficulty: number;
  requiredSkillType1: string;
  requiredSkillValue1: number;
  requiredSkillType2: string;
  requiredSkillValue2: number;
  requiredSkillType3: string;
  requiredSkillValue3: number;
  durationMinutes: number;
  cardSlotCount: number;
  rewardGold: number;
  inProgress: boolean;
}

// 통합 퀘스트 타입 (화면 표시용)
interface Quest {
  questId: number;
  title: string;
  description: string;
  difficulty: number;
  requiredSkillType1: string;
  requiredSkillValue1: number;
  requiredSkillType2: string;
  requiredSkillValue2: number;
  requiredSkillType3: string;
  requiredSkillValue3: number;
  durationMinutes: number;
  cardSlotCount: number;
  rewardGold: number;
  isMain: boolean;
}

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

// --- 난이도 별 표시 컴포넌트 ---
function DifficultyStars({ level, maxStars = 6 }: { level: number; maxStars?: number }) {
  return (
    <div className="quest-stars">
      {Array.from({ length: maxStars }, (_, i) => (
        <img
          key={i}
          src="/assets/003-01/levelStar_000.png"
          alt={i < level ? "★" : "☆"}
          className={`quest-star ${i >= level ? "empty" : ""}`}
          draggable={false}
        />
      ))}
    </div>
  );
}

// --- 퀘스트 카드 컴포넌트 ---
function QuestCard({
  quest,
  isMain = false,
  isSelected = false,
  onClick,
}: {
  quest: Quest;
  isMain?: boolean;
  isSelected?: boolean;
  onClick: () => void;
}) {
  return (
    <NineSliceBox
      src="/assets/003-01/questCard_000.png"
      slice={[200, 208, 200, 208]}
      framePadding={10}
      borderScale={0.4}
      className={`quest-card ${isMain ? "main-quest" : ""} ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, flexDirection: 'row' }}>
        <span className={`quest-card-label ${isMain ? 'main-label' : 'sub-label'}`}>
          {isMain ? "메인 퀘스트" : "서브 퀘스트"} :
        </span>
        <span className="quest-card-title">{quest.title}</span>
      </div>
      <DifficultyStars level={quest.difficulty} />
    </NineSliceBox>
  );
}

// --- 퀘스트 상세 정보 컴포넌트 ---
function QuestDetail({ quest, isAccepting, onAccept }: { quest: Quest | null; isAccepting: boolean; onAccept: () => void }) {
  if (!quest) {
    return (
      <div className="quest-detail-panel">
        <div className="quest-detail-empty">퀘스트를 선택해주세요</div>
      </div>
    );
  }

  return (
    <NineSliceBox
      src="/assets/003-01/questInf_000.png"
      slice={[121, 248, 85, 248]}
      framePadding={24}
      borderScale={0.5}
      className="quest-detail-panel"
    >
      <div className="quest-detail-title">{quest.title}</div>

      {/* 퀘스트 내용 */}
      <NineSliceBox src="/assets/003-01/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={20} borderScale={0.35} className="quest-info-box content-box">
        <div className="quest-info-box-label">퀘스트 내용</div>
        <div className="quest-info-box-text">{quest.description}</div>
      </NineSliceBox>

      {/* 수행 조건 + 예상 시간/보상 */}
      <div className="quest-detail-row">
        <NineSliceBox src="/assets/003-01/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={20} borderScale={0.35} className="quest-info-box">
          <div className="quest-info-box-label">퀘스트 수행 조건</div>
          <div className="quest-info-box-text">
            <div>{quest.requiredSkillType1} / {quest.requiredSkillValue1}</div>
            <div>{quest.requiredSkillType2} / {quest.requiredSkillValue2}</div>
            <div>{quest.requiredSkillType3} / {quest.requiredSkillValue3}</div>
          </div>
        </NineSliceBox>

        <NineSliceBox src="/assets/003-01/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={20} borderScale={0.35} className="quest-info-box">
          <div className="quest-info-box-label">예상 시간 / 보상</div>
          <div className="quest-info-box-text">
            <div>예상 시간 : {quest.durationMinutes}분</div>
            <div>예상 보상 : {quest.rewardGold.toLocaleString()}G</div>
          </div>
        </NineSliceBox>
      </div>

      {/* 수락하기 버튼 */}
      <NineSliceBox
        src="/assets/003-01/questCard_000.png"
        slice={[200, 208, 200, 208]}
        framePadding={10}
        borderScale={0.35}
        className="quest-accept-button"
        onClick={onAccept}
      >
        <span style={{position:'relative', zIndex: 2}}>
          {isAccepting ? "수락 중..." : "수락하기"}
        </span>
      </NineSliceBox>
    </NineSliceBox>
  );
}

// --- Phase 2: 카드 배치 콘텐츠 ---
function Phase2Content({ quest, onCancel }: { quest: Quest | null, onCancel: () => void }) {
  const router = useRouter();
  const { selectingDeskId, startQuest } = useGameStore();
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  const handleAcceptQuest = () => {
    if (!quest) return;

    const duration = quest.durationMinutes * 60;
    const targetDeskId = selectingDeskId !== null ? selectingDeskId : 0;

    startQuest(targetDeskId, duration, quest.rewardGold);
    router.push('/');
  };

  // Dummy card pool
  const CARD_POOL = Array.from({ length: 24 }).map((_, i) => ({
    id: 1000 + i,
    image: `/assets/006/SCardImage_${(i % 20).toString().padStart(3, '0')}.png`,
  }));

  const handleCardClick = (id: number) => {
    setSelectedCards(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      return [...prev, id];
    });
  };

  const [p2ScrollRatio, setP2ScrollRatio] = useState(0);
  const [p2TrackHeight, setP2TrackHeight] = useState(0);
  const [p2WrapperHeight, setP2WrapperHeight] = useState(0);
  const p2GridRef = useRef<HTMLDivElement>(null);
  const p2TrackRef = useRef<HTMLDivElement>(null);
  const p2WrapperRef = useRef<HTMLDivElement>(null);
  const isDraggingP2Ref = useRef(false);
  const dragStartP2YRef = useRef(0);
  const dragStartP2RatioRef = useRef(0);

  const ROW_HEIGHT = 210 + 12;
  const totalRows = Math.ceil(CARD_POOL.length / 3);
  const p2TotalContentHeight = totalRows * ROW_HEIGHT + 32;
  const p2MaxScroll = Math.max(0, p2TotalContentHeight - p2WrapperHeight);
  const p2ScrollOffset = p2ScrollRatio * p2MaxScroll;

  const handleP2Wheel = useCallback((e: React.WheelEvent) => {
    if (p2MaxScroll <= 0) return;
    const delta = e.deltaY / p2MaxScroll;
    setP2ScrollRatio(prev => Math.min(1, Math.max(0, prev + delta * 0.3)));
  }, [p2MaxScroll]);

  const p2ThumbTop = useCallback(() => {
    if (!p2TrackHeight) return 0;
    const trackPadding = 14;
    const thumbSize = 100;
    const maxThumbTop = p2TrackHeight - thumbSize - (trackPadding * 2);
    if (maxThumbTop <= 0) return trackPadding;
    return trackPadding + (p2ScrollRatio * maxThumbTop);
  }, [p2ScrollRatio, p2TrackHeight]);

  useEffect(() => {
    if (p2TrackRef.current) setP2TrackHeight(p2TrackRef.current.clientHeight);
    if (p2WrapperRef.current) setP2WrapperHeight(p2WrapperRef.current.clientHeight);
  }, []);

  const handleP2ThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingP2Ref.current = true;
    dragStartP2YRef.current = e.clientY;
    dragStartP2RatioRef.current = p2ScrollRatio;
  }, [p2ScrollRatio]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingP2Ref.current || !p2TrackRef.current) return;
      const trackHeightCurrent = p2TrackRef.current.clientHeight;
      const trackPadding = 14;
      const thumbSize = 100;
      const maxThumbTop = trackHeightCurrent - thumbSize - (trackPadding * 2);
      if (maxThumbTop <= 0) return;
      const deltaY = e.clientY - dragStartP2YRef.current;
      const newRatio = Math.min(1, Math.max(0, dragStartP2RatioRef.current + deltaY / maxThumbTop));
      setP2ScrollRatio(newRatio);
    };
    const handleMouseUp = () => { isDraggingP2Ref.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleP2TrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!p2TrackRef.current) return;
    const rect = p2TrackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeightCurrent = rect.height;
    const trackPadding = 14;
    const thumbSize = 100;
    const maxThumbTop = trackHeightCurrent - thumbSize - (trackPadding * 2);
    if (maxThumbTop <= 0) return;
    const adjustedClickY = clickY - trackPadding;
    const newRatio = Math.min(1, Math.max(0, (adjustedClickY - thumbSize / 2) / maxThumbTop));
    setP2ScrollRatio(newRatio);
  }, []);

  if (!quest) return null;

  return (
    <div className="phase2-container">
      {/* ──── 좌측: 카드 목록 ──── */}
      <NineSliceBox src="/assets/003-02/questInf_000.png" slice={[121, 248, 85, 248]} framePadding={24} borderScale={0.5} className="phase2-left-box">
        <div className="phase2-card-grid-wrapper" ref={p2WrapperRef} onWheel={handleP2Wheel} style={{ flex: 1, overflow: 'hidden' }}>
          <div className="phase2-card-grid" ref={p2GridRef} style={{ transform: `translateY(-${p2ScrollOffset}px)` }}>
            {CARD_POOL.map((card) => {
              const selected = selectedCards.includes(card.id);
              return (
                <div key={card.id} className={`phase2-card-item ${selected ? 'selected' : ''}`} onClick={() => handleCardClick(card.id)}>
                  <img src={card.image} alt="card" draggable={false} />
                  {selected && <div className="phase2-card-highlight"></div>}
                </div>
              );
            })}
          </div>
        </div>
      </NineSliceBox>

      {/* ──── 중간: 스크롤바 ──── */}
      <div className="scrollbar-column phase2-scrollbar-column">
        <div ref={p2TrackRef} className="scrollbar-track" onClick={handleP2TrackClick}>
           <div className="scrollbar-thumb" style={{ top: p2ThumbTop() }} onMouseDown={handleP2ThumbMouseDown} />
        </div>
      </div>

      {/* ──── 우측: 퀘스트 프레임 ──── */}
      <NineSliceBox src="/assets/003-02/questInf_000.png" slice={[121, 248, 85, 248]} framePadding={20} borderScale={0.5} className="phase2-right-box">
        {/* Top: 퀘스트 제목 */}
        <NineSliceBox src="/assets/003-02/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="phase2-right-title-box">
          <div className="phase2-info-title">{quest.title}</div>
          <div className="phase2-info-subtitle">(퀘스트 제목)</div>
        </NineSliceBox>

        {/* Middle: 카드 배치 현황판 */}
        <NineSliceBox src="/assets/003-02/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="phase2-right-drop-box">
          <div className="phase2-drop-cards">
            {selectedCards.map((id, index) => {
              const card = CARD_POOL.find(c => c.id === id);
              if (!card) return null;
              const maxCardsBeforeOverlap = 3;
              const overlapOffset = selectedCards.length > maxCardsBeforeOverlap ? -40 : 10;
              return (
                <img
                  key={id}
                  src={card.image}
                  alt="selected"
                  className="phase2-dropped-card"
                  style={{ zIndex: index, marginLeft: index > 0 ? overlapOffset : 0 }}
                  onClick={() => handleCardClick(id)}
                  draggable={false}
                />
              );
            })}
          </div>
        </NineSliceBox>

        {/* Bottom variables */}
        <div className="phase2-right-bottom-row">
          <NineSliceBox src="/assets/003-02/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="phase2-info-box">
            <div className="quest-info-box-label">퀘스트 수행 조건</div>
            <div className="quest-info-box-text">
              <div>{quest.requiredSkillType1} / {quest.requiredSkillValue1}</div>
              <div>{quest.requiredSkillType2} / {quest.requiredSkillValue2}</div>
              <div>{quest.requiredSkillType3} / {quest.requiredSkillValue3}</div>
            </div>
          </NineSliceBox>
          <NineSliceBox src="/assets/003-02/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="phase2-info-box">
             <div className="quest-info-box-label">예상 시간 / 보상</div>
             <div className="quest-info-box-text">
               <div>예상 시간 : {quest.durationMinutes}분</div>
               <div>예상 보상 : {quest.rewardGold.toLocaleString()}G</div>
             </div>
          </NineSliceBox>
        </div>

        {/* 수락하기 / 취소하기 버튼 */}
        <div className="phase2-action-buttons">
          <NineSliceBox
            src="/assets/003-01/questCard_000.png"
            slice={[200, 208, 200, 208]}
            framePadding={10}
            borderScale={0.35}
            className="phase2-btn-cancel"
            onClick={onCancel}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>취소하기</span>
          </NineSliceBox>

          <NineSliceBox
              src="/assets/003-01/questCard_000.png"
              slice={[200, 208, 200, 208]}
              framePadding={10}
              borderScale={0.35}
              className="phase2-btn-accept"
              onClick={handleAcceptQuest}
          >
              <span style={{ position: 'relative', zIndex: 2 }}>수락하기</span>
          </NineSliceBox>
        </div>

      </NineSliceBox>
    </div>
  );
}

/* ============================================================
   메인 페이지 컴포넌트
   ============================================================ */
export default function QuestPage() {
  const { getAccessToken } = usePrivy();
  const { accessToken } = useGameStore();

  const [phase, setPhase] = useState<'select' | 'placement'>('select');
  const [mainQuest, setMainQuest] = useState<Quest | null>(null);
  const [subQuests, setSubQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // --- 인증 토큰 가져오기 ---
  const getAuthToken = useCallback(async () => {
    return accessToken || await getAccessToken();
  }, [accessToken, getAccessToken]);

  // --- 메인 퀘스트 조회 ---
  const fetchMainQuest = useCallback(async (chapter: number) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/v1/quests/main?chapterNumber=${chapter}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data && Array.isArray(json.data) && json.data.length > 0) {
        const d: MainQuestData = json.data[0];
        const quest: Quest = {
          questId: d.questId,
          title: d.title,
          description: d.description,
          difficulty: d.difficulty,
          requiredSkillType1: d.requiredSkillType1,
          requiredSkillValue1: d.requiredSkillValue1,
          requiredSkillType2: d.requiredSkillType2,
          requiredSkillValue2: d.requiredSkillValue2,
          requiredSkillType3: d.requiredSkillType3,
          requiredSkillValue3: d.requiredSkillValue3,
          durationMinutes: d.durationMinutes,
          cardSlotCount: d.cardSlotCount,
          rewardGold: d.rewardGold,
          isMain: true,
        };
        setMainQuest(quest);
        setSelectedQuest(quest);
        setChapterNumber(d.chapterNo);
      }
    } catch (err) {
      console.error("메인 퀘스트 조회 실패:", err);
    }
  }, [getAuthToken]);

  // --- 서브 퀘스트 목록 조회 ---
  const fetchSubQuests = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/v1/quests/sub`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        const quests: Quest[] = json.data.map((d: SubQuestData) => ({
          questId: d.questId,
          title: d.title,
          description: d.description,
          difficulty: d.difficulty,
          requiredSkillType1: d.requiredSkillType1,
          requiredSkillValue1: d.requiredSkillValue1,
          requiredSkillType2: d.requiredSkillType2,
          requiredSkillValue2: d.requiredSkillValue2,
          requiredSkillType3: d.requiredSkillType3,
          requiredSkillValue3: d.requiredSkillValue3,
          durationMinutes: d.durationMinutes,
          cardSlotCount: d.cardSlotCount,
          rewardGold: d.rewardGold,
          isMain: false,
        }));
        setSubQuests(quests);
      }
    } catch (err) {
      console.error("서브 퀘스트 조회 실패:", err);
    }
  }, [getAuthToken]);

  // --- 초기 데이터 로드 ---
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchMainQuest(chapterNumber), fetchSubQuests()]);
      setIsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 퀘스트 수락 (GET /api/v1/quests/{questId}?type=main|sub) ---
  const handleAcceptQuest = useCallback(async () => {
    if (!selectedQuest || isAccepting) return;
    setIsAccepting(true);
    try {
      const token = await getAuthToken();
      const type = selectedQuest.isMain ? 'main' : 'sub';
      const res = await fetch(`${API_HOST}/api/v1/quests/${selectedQuest.questId}?type=${type}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setPhase('placement');
      } else {
        console.error("퀘스트 수락 실패:", res.status);
      }
    } catch (err) {
      console.error("퀘스트 수락 실패:", err);
    } finally {
      setIsAccepting(false);
    }
  }, [selectedQuest, isAccepting, getAuthToken]);

  // --- 서브 퀘스트 새로고침 ---
  const refreshSubQuests = useCallback(async () => {
    setIsRefreshing(true);
    await fetchSubQuests();
    setScrollRatio(0);
    if (mainQuest) setSelectedQuest(mainQuest);
    setIsRefreshing(false);
  }, [fetchSubQuests, mainQuest]);

  // --- 커스텀 스크롤바 상태 ---
  const [scrollRatio, setScrollRatio] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const subQuestListRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartRatioRef = useRef(0);

  const CARD_HEIGHT = 78;
  const VISIBLE_CARDS = 4;
  const visibleHeight = CARD_HEIGHT * VISIBLE_CARDS;

  const totalContentHeight = subQuests.length * CARD_HEIGHT;
  const maxScroll = Math.max(0, totalContentHeight - visibleHeight);
  const scrollOffset = scrollRatio * maxScroll;

  useEffect(() => {
    if (scrollTrackRef.current) {
      setTrackHeight(scrollTrackRef.current.clientHeight);
    }
  }, []);

  const getThumbTop = useCallback(() => {
    if (!trackHeight) return 0;
    const thumbSize = 18;
    const trackPadding = thumbSize / 2; // 썸 중심이 트랙 경계와 맞도록
    const maxThumbTop = trackHeight - thumbSize - (trackPadding * 2);
    if (maxThumbTop <= 0) return trackPadding;
    return trackPadding + (scrollRatio * maxThumbTop);
  }, [scrollRatio, trackHeight]);

  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      dragStartYRef.current = e.clientY;
      dragStartRatioRef.current = scrollRatio;
    },
    [scrollRatio]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !scrollTrackRef.current) return;
      const trackHeightCurrent = scrollTrackRef.current.clientHeight;
      const thumbSize = 18;
      const trackPadding = thumbSize / 2; // 썸 중심이 트랙 경계와 맞도록
      const maxThumbTop = trackHeightCurrent - thumbSize - (trackPadding * 2);
      if (maxThumbTop <= 0) return;

      const deltaY = e.clientY - dragStartYRef.current;
      const deltaRatio = deltaY / maxThumbTop;
      const newRatio = Math.min(1, Math.max(0, dragStartRatioRef.current + deltaRatio));
      setScrollRatio(newRatio);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!scrollTrackRef.current) return;
      const rect = scrollTrackRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const trackHeightCurrent = rect.height;
      const thumbSize = 18;
      const trackPadding = thumbSize / 2; // 썸 중심이 트랙 경계와 맞도록
      const maxThumbTop = trackHeightCurrent - thumbSize - (trackPadding * 2);
      if (maxThumbTop <= 0) return;

      const adjustedClickY = clickY - trackPadding;
      const newRatio = Math.min(1, Math.max(0, (adjustedClickY - thumbSize / 2) / maxThumbTop));
      setScrollRatio(newRatio);
    },
    []
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (maxScroll <= 0) return;
      const delta = e.deltaY / maxScroll;
      setScrollRatio((prev) => Math.min(1, Math.max(0, prev + delta * 0.3)));
    },
    [maxScroll]
  );

  return (
    <div className="quest-page-container">

        {/* 상단 타이틀 */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <NineSliceBox
            src="/assets/003-01/questCard_000.png"
            slice={[200, 208, 200, 208]}
            framePadding={14}
            borderScale={0.4}
            className="quest-page-title-box"
          >
            <h1 className="quest-page-title">회사 프로젝트 정하기</h1>
          </NineSliceBox>
        </div>

        {/* 메인 콘텐츠 래퍼 (슬라이딩 애니메이션) */}
      <div className={`quest-content-wrapper phase-${phase}`}>
        {/* === Phase 1: 퀘스트 목록 화면 === */}
        <div className="quest-content phase-1-content">
          {/* ──── 좌측: 퀘스트 리스트 ──── */}
          <div className="quest-left-area" onWheel={handleWheel}>
            <div className="quest-list-column">
              {/* 메인 퀘스트 (고정) */}
              {mainQuest ? (
                <QuestCard
                  quest={mainQuest}
                  isMain
                  isSelected={selectedQuest?.questId === mainQuest.questId && selectedQuest?.isMain}
                  onClick={() => setSelectedQuest(mainQuest)}
                />
              ) : (
                <div style={{ minHeight: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8ab0', fontFamily: "'StardustS', 'Stardust', sans-serif", fontSize: '18px' }}>
                  {isLoading ? "로딩 중..." : "메인 퀘스트 없음"}
                </div>
              )}

              {/* 서브 퀘스트 (스크롤 영역) */}
              <div
                className="sub-quest-scroll-area"
                style={{ height: visibleHeight }}
              >
                <div
                  ref={subQuestListRef}
                  className="sub-quest-list"
                  style={{ transform: `translateY(-${scrollOffset}px)` }}
                >
                  {isLoading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#8a8ab0', fontFamily: "'StardustS', 'Stardust', sans-serif", fontSize: '18px' }}>
                      로딩 중...
                    </div>
                  ) : subQuests.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#8a8ab0', fontFamily: "'StardustS', 'Stardust', sans-serif", fontSize: '18px' }}>
                      서브 퀘스트가 없습니다
                    </div>
                  ) : (
                    subQuests.map((quest) => (
                      <QuestCard
                        key={quest.questId}
                        quest={quest}
                        isSelected={selectedQuest?.questId === quest.questId && !selectedQuest?.isMain}
                        onClick={() => setSelectedQuest(quest)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ──── 중앙: 스크롤바 + 새로고침 ──── */}
          <div className="scrollbar-column" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="scrollbar-spacer" />

            <div
              ref={scrollTrackRef}
              className="scrollbar-track"
              onClick={handleTrackClick}
            >
              <div
                className="scrollbar-thumb"
                style={{ top: getThumbTop() }}
                onMouseDown={handleThumbMouseDown}
              />
            </div>

            <button
              className="refresh-button"
              onClick={refreshSubQuests}
              disabled={isRefreshing}
              title="서브 퀘스트 새로고침"
            >
              <img
                src={
                  isRefreshing
                    ? "/assets/003-01/refreshButton_001.png"
                    : "/assets/003-01/refreshButton_000.png"
                }
                alt="새로고침"
                draggable={false}
              />
            </button>
          </div>

          {/* ──── 우측: 퀘스트 상세 정보 ──── */}
          <QuestDetail quest={selectedQuest} isAccepting={isAccepting} onAccept={handleAcceptQuest} />
        </div>

        {/* === Phase 2: 카드 배치 화면 === */}
        <div className="quest-content phase-2-content">
          <Phase2Content quest={selectedQuest} onCancel={() => setPhase('select')} />
        </div>
      </div>
      </div>
  );
}
