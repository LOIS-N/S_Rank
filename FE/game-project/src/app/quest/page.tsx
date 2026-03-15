"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./quest.css";

/* ============================================================
   [가이드라인] API/ERD 데이터 연결
   ─────────────────────────────
   아래 인터페이스와 더미 데이터는 나중에 실제 ERD/API를 연결할 때
   교체해야 합니다. 교체 방법:

   1. Quest 인터페이스의 필드명을 ERD 테이블 컬럼명에 맞춰 변경
   2. MAIN_QUEST_DATA와 INITIAL_SUB_QUESTS를 API 호출로 교체
      예: const { data: mainQuest } = useSWR('/api/quests/main', fetcher);
      예: const { data: subQuests } = useSWR('/api/quests/sub', fetcher);
   3. refreshSubQuests() 함수를 실제 API 재호출 로직으로 교체
      예: mutate('/api/quests/sub') (SWR 사용 시)
   ============================================================ */

// --- 퀘스트 데이터 인터페이스 ---
// TODO: ERD 설계 후, 실제 API 응답 타입에 맞게 수정할 것
interface Quest {
  id: number;
  title: string;         // 퀘스트 제목 (API 필드명에 맞게 변경)
  difficulty: number;    // 난이도 (1~5) (API 필드명에 맞게 변경)
  description: string;   // 퀘스트 내용 (API 필드명에 맞게 변경)
  conditions: string[];  // 수행 조건 목록 (API 필드명에 맞게 변경)
  estimatedTime: string; // 예상 시간 (API 필드명에 맞게 변경)
  reward: string;        // 예상 보상 (API 필드명에 맞게 변경)
}

/* ============================================================
   [더미 데이터] 아래 데이터들을 API 응답으로 교체하세요
   ============================================================ */

// TODO: API 연결 시 실제 메인 퀘스트 데이터로 교체
const MAIN_QUEST_DATA: Quest = {
  id: 0,
  title: "열심히 일한다",
  difficulty: 5,
  description: "열심히 일해서 회사를 성장시키자! 매일 꾸준히 업무를 수행하고, 팀원들과 협력하여 프로젝트를 완성하라.",
  conditions: ["BE 50", "FE 50", "AI 50"],
  estimatedTime: "4시간",
  reward: "50,000G",
};

// TODO: API 연결 시 실제 서브 퀘스트 목록으로 교체
const INITIAL_SUB_QUESTS: Quest[] = [
  {
    id: 1,
    title: "노래 듣기",
    difficulty: 2,
    description: "작업 중 음악을 들으며 집중력을 높인다. 최소 3곡 이상을 들어보자.",
    conditions: ["집중력 30"],
    estimatedTime: "1시간",
    reward: "5,000G",
  },
  {
    id: 2,
    title: "운동 하기",
    difficulty: 3,
    description: "건강한 체력은 개발의 기본! 스트레칭과 간단한 운동으로 체력을 관리하자.",
    conditions: ["체력 40", "건강 20"],
    estimatedTime: "2시간",
    reward: "10,000G",
  },
  {
    id: 3,
    title: "게임 하기",
    difficulty: 5,
    description: "팀원들과 함께 게임을 플레이하며 팀워크를 키우자. 승리하면 추가 보상!",
    conditions: ["팀워크 50", "전략 30", "반응속도 40"],
    estimatedTime: "3시간",
    reward: "30,000G",
  },
  {
    id: 4,
    title: "코드 리뷰",
    difficulty: 4,
    description: "동료의 코드를 리뷰하고 피드백을 남기자. 좋은 코드 리뷰는 팀 전체의 실력을 향상시킨다.",
    conditions: ["코딩 스킬 40", "커뮤니케이션 30"],
    estimatedTime: "2시간",
    reward: "20,000G",
  },
  {
    id: 5,
    title: "문서 작성",
    difficulty: 3,
    description: "프로젝트의 기술 문서를 작성하여 팀원들의 이해를 돕자.",
    conditions: ["문서화 능력 35"],
    estimatedTime: "1시간 30분",
    reward: "8,000G",
  },
];

/* ============================================================
   [더미 데이터] 새로고침 시 랜덤으로 표시될 퀘스트 풀
   TODO: API 연결 후에는 이 배열 대신 API를 다시 호출하세요.
   ============================================================ */
const REFRESH_QUEST_POOL: Omit<Quest, "id">[] = [
  { title: "디자인 회의", difficulty: 2, description: "UI/UX 디자인 방향성을 논의하자.", conditions: ["창의력 25"], estimatedTime: "1시간", reward: "6,000G" },
  { title: "버그 수정", difficulty: 4, description: "보고된 버그를 신속히 수정하자.", conditions: ["디버깅 45", "인내심 30"], estimatedTime: "3시간", reward: "25,000G" },
  { title: "테스트 작성", difficulty: 3, description: "단위 테스트와 통합 테스트를 작성하자.", conditions: ["테스트 스킬 35"], estimatedTime: "2시간", reward: "15,000G" },
  { title: "기술 세미나", difficulty: 1, description: "최신 기술 트렌드에 대해 학습하자.", conditions: ["학습 의지 20"], estimatedTime: "1시간", reward: "3,000G" },
  { title: "데이터베이스 최적화", difficulty: 5, description: "느린 쿼리를 최적화하여 성능을 개선하자.", conditions: ["DB 스킬 50", "분석력 40"], estimatedTime: "4시간", reward: "40,000G" },
  { title: "배포 준비", difficulty: 4, description: "프로덕션 배포를 위한 최종 점검을 수행하자.", conditions: ["배포 경험 40", "꼼꼼함 35"], estimatedTime: "2시간 30분", reward: "22,000G" },
  { title: "사용자 피드백 분석", difficulty: 2, description: "수집된 사용자 피드백을 정리하고 분석하자.", conditions: ["분석력 25"], estimatedTime: "1시간 30분", reward: "7,000G" },
  { title: "API 설계", difficulty: 4, description: "RESTful API를 설계하고 문서화하자.", conditions: ["설계 능력 40", "REST 이해 35"], estimatedTime: "3시간", reward: "28,000G" },
];

// --- 공용 JS 9-slice 컴포넌트 ---
// 에셋의 거대한 투명 여백을 CSS border-image로 완벽하게 치환하여 비율 왜곡을 없앱니다.
interface NineSliceBoxProps {
  src: string;
  slice: [number, number, number, number]; // [top, right, bottom, left]
  framePadding: number; // 실제 콘텐츠 영역의 안쪽 여백
  borderScale?: number; // 테두리를 시각적으로 얇게 렌더링하기 위한 배율
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

function NineSliceBox({ src, slice, framePadding, borderScale = 1, children, className, style, onClick }: NineSliceBoxProps) {
  const t = slice[0] * borderScale;
  const r = slice[1] * borderScale;
  const b = slice[2] * borderScale;
  const l = slice[3] * borderScale;

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
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// --- 난이도 별 표시 컴포넌트 ---
function DifficultyStars({ level, maxStars = 5 }: { level: number; maxStars?: number }) {
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
        {/* TODO: quest.title을 API 응답 필드명으로 교체 */}
        <span className="quest-card-title">{quest.title}</span>
      </div>
      <DifficultyStars level={quest.difficulty} />
    </NineSliceBox>
  );
}

// --- 퀘스트 상세 정보 컴포넌트 ---
function QuestDetail({ quest, onAccept }: { quest: Quest | null, onAccept: () => void }) {
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
      {/* TODO: quest.title → API 응답 필드명으로 교체 */}
      <div className="quest-detail-title">{quest.title}</div>

      {/* 퀘스트 내용 */}
      {/* TODO: quest.description → API 응답 필드명으로 교체 */}
      <NineSliceBox src="/assets/003-01/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={20} borderScale={0.35} className="quest-info-box content-box">
        <div className="quest-info-box-label">퀘스트 내용</div>
        <div className="quest-info-box-text">{quest.description}</div>
      </NineSliceBox>

      {/* 수행 조건 + 예상 시간/보상 */}
      <div className="quest-detail-row">
        {/* TODO: quest.conditions → API 응답 필드명으로 교체 */}
        <NineSliceBox src="/assets/003-01/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={20} borderScale={0.35} className="quest-info-box">
          <div className="quest-info-box-label">퀘스트 수행 조건</div>
          <div className="quest-info-box-text">
            {quest.conditions.map((cond, i) => (
              <div key={i}>{cond}</div>
            ))}
          </div>
        </NineSliceBox>

        {/* TODO: quest.estimatedTime, quest.reward → API 응답 필드명으로 교체 */}
        <NineSliceBox src="/assets/003-01/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={20} borderScale={0.35} className="quest-info-box">
          <div className="quest-info-box-label">예상 시간 / 보상</div>
          <div className="quest-info-box-text">
            <div>예상 시간 : {quest.estimatedTime}</div>
            <div>예상 보상 : {quest.reward}</div>
          </div>
        </NineSliceBox>
      </div>

      {/* 수락하기 버튼 */}
      {/* ============================================================
          [가이드라인] 카드 배치 페이지 연결
          ─────────────────────────────
          수락하기 버튼 클릭 시 카드 배치 페이지로 이동해야 합니다.
          부모 페이지 또는 라우터 설정이 완료되면 아래 코드를 수정하세요:
          
          1. Next.js App Router 사용 시:
             import { useRouter } from 'next/navigation';
             const router = useRouter();
             onClick={() => router.push('/card-placement')}
          
          2. 또는 quest.id를 쿼리로 전달:
             router.push(`/card-placement?questId=${quest.id}`)
          
          3. 상태 관리가 필요하면 Zustand store에 selectedQuestId를 저장 후 이동
          ============================================================ */}
      <NineSliceBox
        src="/assets/003-01/questCard_000.png"
        slice={[200, 208, 200, 208]}
        framePadding={10}
        borderScale={0.35}
        className="quest-accept-button"
        onClick={onAccept}
      >
        <span style={{position:'relative', zIndex: 2}}>수락하기</span>
      </NineSliceBox>
    </NineSliceBox>
  );
}

// --- Phase 2: 카드 배치 콘텐츠 ---
function Phase2Content({ quest }: { quest: Quest | null }) {
  const router = useRouter();
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  // Dummy card pool
  const CARD_POOL = Array.from({ length: 24 }).map((_, i) => ({
    id: 1000 + i,
    image: `/assets/003-02/SCardImage_00${i % 3}.png`,
  }));

  const handleCardClick = (id: number) => {
    setSelectedCards(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      return [...prev, id];
    });
  };

  // Phase 2 left scrollbar logic
  const [p2ScrollRatio, setP2ScrollRatio] = useState(0);
  const [p2TrackHeight, setP2TrackHeight] = useState(0);
  const p2GridRef = useRef<HTMLDivElement>(null);
  const p2TrackRef = useRef<HTMLDivElement>(null);
  const isDraggingP2Ref = useRef(false);
  const dragStartP2YRef = useRef(0);
  const dragStartP2RatioRef = useRef(0);

  const ROW_HEIGHT = 160;
  const VISIBLE_ROWS = 3;
  const totalRows = Math.ceil(CARD_POOL.length / 4);
  const p2TotalContentHeight = totalRows * ROW_HEIGHT;
  const p2VisibleHeight = VISIBLE_ROWS * ROW_HEIGHT;
  const p2MaxScroll = Math.max(0, p2TotalContentHeight - p2VisibleHeight);
  const p2ScrollOffset = p2ScrollRatio * p2MaxScroll;

  const handleP2Wheel = useCallback((e: React.WheelEvent) => {
    if (p2MaxScroll <= 0) return;
    const delta = e.deltaY / p2MaxScroll;
    setP2ScrollRatio(prev => Math.min(1, Math.max(0, prev + delta * 0.3)));
  }, [p2MaxScroll]);

  const p2ThumbTop = useCallback(() => {
    if (!p2TrackHeight) return 0;
    const trackPadding = 14;
    const thumbSize = 24; 
    const maxThumbTop = p2TrackHeight - thumbSize - (trackPadding * 2);
    if (maxThumbTop <= 0) return trackPadding;
    return trackPadding + (p2ScrollRatio * maxThumbTop);
  }, [p2ScrollRatio, p2TrackHeight]);

  useEffect(() => {
    if (p2TrackRef.current) setP2TrackHeight(p2TrackRef.current.clientHeight);
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
      const thumbSize = 24;
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
    const thumbSize = 24;
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
        <div className="phase2-card-grid-wrapper" onWheel={handleP2Wheel} style={{ height: p2VisibleHeight }}>
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
              {quest.conditions.map((cond, i) => <div key={i}>{cond}</div>)}
            </div>
          </NineSliceBox>
          <NineSliceBox src="/assets/003-02/questInf_001.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="phase2-info-box">
             <div className="quest-info-box-label">예상 시간 / 보상</div>
             <div className="quest-info-box-text">
               <div>예상 시간 : {quest.estimatedTime}</div>
               <div>예상 보상 : {quest.reward}</div>
             </div>
          </NineSliceBox>
        </div>

        {/* 수락하기 버튼 */}
        <NineSliceBox
            src="/assets/003-01/questCard_000.png"
            slice={[200, 208, 200, 208]}
            framePadding={10}
            borderScale={0.35}
            className="quest-accept-button phase2-accept-button"
            onClick={() => router.push('/')}
        >
            <span style={{position:'relative', zIndex: 2}}>수락하기</span>
        </NineSliceBox>

      </NineSliceBox>
    </div>
  );
}

/* ============================================================
   메인 페이지 컴포넌트
   ============================================================ */
export default function QuestPage() {
  const [phase, setPhase] = useState<'select' | 'placement'>('select');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(MAIN_QUEST_DATA);
  const [subQuests, setSubQuests] = useState<Quest[]>(INITIAL_SUB_QUESTS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // --- 반응형 스케일 상태 ---
  const [scale, setScale] = useState(1);

  // --- 커스텀 스크롤바 상태 ---
  const [scrollRatio, setScrollRatio] = useState(0); // 0 ~ 1
  const [trackHeight, setTrackHeight] = useState(0); // 렌더링 중 ref 접근 방지
  const subQuestListRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartRatioRef = useRef(0);

  // 서브 퀘스트 총 높이 계산
  const CARD_HEIGHT = 66; // quest-card min-height + gap
  const VISIBLE_CARDS = 4;
  const visibleHeight = CARD_HEIGHT * VISIBLE_CARDS;

  const totalContentHeight = subQuests.length * CARD_HEIGHT;
  const maxScroll = Math.max(0, totalContentHeight - visibleHeight);

  // 스크롤 위치 = scrollRatio * maxScroll
  const scrollOffset = scrollRatio * maxScroll;

  useEffect(() => {
    if (scrollTrackRef.current) {
      setTrackHeight(scrollTrackRef.current.clientHeight);
    }
  }, []);

  // 스크롤바 thumb 위치 계산
  const getThumbTop = useCallback(() => {
    if (!trackHeight) return 0;
    const trackPadding = 14; // 스크롤 트랙 상하단 그래픽 여백 (방지턱)
    const thumbSize = 24; 
    const maxThumbTop = trackHeight - thumbSize - (trackPadding * 2);
    if (maxThumbTop <= 0) return trackPadding;
    return trackPadding + (scrollRatio * maxThumbTop);
  }, [scrollRatio, trackHeight]);

  // 마우스 드래그로 스크롤바 조작
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
      const trackPadding = 14;
      const thumbSize = 24;
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

  // --- 윈도우 리사이즈 스케일링 적용 ---
  useEffect(() => {
    const handleResize = () => {
      // 1280x720 원본 비율을 기준으로 현재 창 크기에 맞게 스케일 계산
      const scaleX = window.innerWidth / 1280;
      const scaleY = window.innerHeight / 720;
      // 화면에 요소가 잘리지 않도록 더 작은 비율을 선택
      setScale(Math.min(scaleX, scaleY));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 트랙 클릭으로 스크롤 이동
  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!scrollTrackRef.current) return;
      const rect = scrollTrackRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const trackHeightCurrent = rect.height;
      const trackPadding = 14;
      const thumbSize = 24;
      const maxThumbTop = trackHeightCurrent - thumbSize - (trackPadding * 2);
      if (maxThumbTop <= 0) return;
      
      const adjustedClickY = clickY - trackPadding;
      const newRatio = Math.min(1, Math.max(0, (adjustedClickY - thumbSize / 2) / maxThumbTop));
      setScrollRatio(newRatio);
    },
    []
  );

  // 마우스 휠로 스크롤
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (maxScroll <= 0) return;
      const delta = e.deltaY / maxScroll;
      setScrollRatio((prev) => Math.min(1, Math.max(0, prev + delta * 0.3)));
    },
    [maxScroll]
  );

  /* ============================================================
     [가이드라인] 새로고침 로직
     ─────────────────────────────
     현재: REFRESH_QUEST_POOL에서 랜덤으로 서브 퀘스트를 교체
     API 연결 후: fetch('/api/quests/sub/refresh') 호출로 교체
     
     예시:
     const refreshSubQuests = async () => {
       setIsRefreshing(true);
       const res = await fetch('/api/quests/sub/refresh');
       const data = await res.json();
       setSubQuests(data.quests);  // API 응답 구조에 맞게 수정
       setIsRefreshing(false);
     };
     ============================================================ */
  const refreshSubQuests = useCallback(() => {
    setIsRefreshing(true);

    // 랜덤으로 3~5개의 서브 퀘스트를 풀에서 선택
    const shuffled = [...REFRESH_QUEST_POOL].sort(() => Math.random() - 0.5);
    const count = 3 + Math.floor(Math.random() * 3);
    const newQuests: Quest[] = shuffled.slice(0, count).map((q, i) => ({
      ...q,
      id: 100 + i + Math.floor(Math.random() * 1000),
    }));

    setTimeout(() => {
      setSubQuests(newQuests);
      setScrollRatio(0);
      setSelectedQuest(MAIN_QUEST_DATA); // 선택 초기화
      setIsRefreshing(false);
    }, 300);
  }, []);

  /* ============================================================
     [가이드라인] PWA / 반응형 스케일링
     ─────────────────────────────
     이 페이지는 1280x720 고정 크기로 설계되어 있습니다.
     PWA 환경에서 다양한 화면 크기에 대응하려면,
     부모 레이아웃에서 CSS transform: scale()을 적용하거나,
     이 컨테이너를 viewport에 맞춰 동적으로 스케일링하세요.
     
     예시 (부모 레이아웃):
     const scale = Math.min(
       window.innerWidth / 1280,
       window.innerHeight / 720
     );
     style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
     ============================================================ */

  return (
    <div className="quest-page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div 
        className="quest-page-container" 
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
      >
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
          {/* ──── 좌측: 퀘스트 리스트 + 스크롤바 ──── */}
          <div className="quest-left-area" onWheel={handleWheel}>
          {/* 퀘스트 리스트 */}
          <div className="quest-list-column">
            {/* 메인 퀘스트 (고정, 스크롤 영향 안 받음) */}
            <QuestCard
              quest={MAIN_QUEST_DATA}
              isMain
              isSelected={selectedQuest?.id === MAIN_QUEST_DATA.id}
              onClick={() => setSelectedQuest(MAIN_QUEST_DATA)}
            />

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
                {subQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    isSelected={selectedQuest?.id === quest.id}
                    onClick={() => setSelectedQuest(quest)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 커스텀 스크롤바 + 새로고침 */}
          <div className="scrollbar-column" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* 메인 퀘스트 높이만큼 스페이서 */}
            <div className="scrollbar-spacer" style={{ height: '62px' }} />

            {/* 스크롤바 트랙 */}
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

            {/* 새로고침 버튼 */}
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
        </div>

        {/* ──── 우측: 퀘스트 상세 정보 ──── */}
        <QuestDetail quest={selectedQuest} onAccept={() => setPhase('placement')} />
        </div>

        {/* === Phase 2: 카드 배치 화면 === */}
        <div className="quest-content phase-2-content">
          <Phase2Content quest={selectedQuest} />
        </div>
      </div>

      {/* ============================================================
          [가이드라인] 하단 네비게이션 바
          ─────────────────────────────
          하단 네비게이션 바는 부모 페이지(레이아웃)에서 관리합니다.
          
          부모 레이아웃 파일에서:
          1. <BottomNavBar /> 또는 유사한 컴포넌트를 이 페이지 아래에 렌더링
          2. 탭 목록: 카드목록, 퀘스트, 메인화면, 뽑기, 강화, 합성, 거래
          3. 각 탭의 라우트:
             - 카드목록: /card-list
             - 퀘스트: /quest (현재 페이지)
             - 메인화면: /
             - 뽑기: /gacha
             - 강화: /enhance
             - 합성: /synthesis
             - 거래: /trade
          4. 활성 탭 표시: usePathname() 훅을 사용하여 현재 경로와 비교
          
          예시 코드 (부모 layout.tsx):
          ```
          import { usePathname } from 'next/navigation';
          
          const tabs = [
            { label: '카드목록', path: '/card-list' },
            { label: '퀘스트', path: '/quest' },
            { label: '메인화면', path: '/' },
            { label: '뽑기', path: '/gacha' },
            { label: '강화', path: '/enhance' },
            { label: '합성', path: '/synthesis' },
            { label: '거래', path: '/trade' },
          ];
          
          <nav className="bottom-nav">
            {tabs.map(tab => (
              <Link
                key={tab.path}
                href={tab.path}
                className={pathname === tab.path ? 'active' : ''}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          ```
          ============================================================ */}
      </div>
    </div>
  );
}
