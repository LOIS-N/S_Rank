"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";
import api from "@/lib/axios";
import { sendGAEvent } from "@/lib/gtag";
import { TUTORIAL_QUEST_2, TUTORIAL_QUEST_3, TUTORIAL_QUEST_4 } from "@/lib/tutorialData";
import "./quest.css";

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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

// --- 카드 관련 타입 (card-list 동일) ---
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
  specialAbility: { name: string; description: string; effects: Array<{ effectType: string; effectOperator: string; effectAmount: number; targetScope: string }> | string } | null;
  enhanceSuccessCount: number;
}

// --- 스킬 필터 옵션 ---
const SKILL_FILTERS = ["ALL", "BE", "FE", "AI", "DBA", "DEV", "DESIGN"] as const;

const GRADE_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

function displaySkillType(type: string): string {
  return type.toUpperCase() === 'DEVOPS' ? 'DEV' : type.toUpperCase();
}

// BE에서 초 단위로 받은 duration을 표시용 문자열로 변환
// 60초 미만 → "N초", 60초 이상 → "N분"
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}초`;
  return `${Math.round(seconds / 60)}분`;
}

// 카드 스탯 배율 → 시간 비율 변환 (구간별 선형 보간)
// 1.0x=100%, 1.25x=88%, 1.5x=76%, 1.75x=63%, 2.0x 이상=50% (하드캡)
const TIME_RATIO_BREAKPOINTS: [number, number][] = [
  [1.00, 1.00],
  [1.25, 0.88],
  [1.50, 0.76],
  [1.75, 0.63],
  [2.00, 0.50],
];

function getTimeRatio(statRatio: number): number {
  if (statRatio <= 1.0) return 1.0;
  if (statRatio >= 2.0) return 0.5;
  for (let i = 0; i < TIME_RATIO_BREAKPOINTS.length - 1; i++) {
    const [x1, y1] = TIME_RATIO_BREAKPOINTS[i];
    const [x2, y2] = TIME_RATIO_BREAKPOINTS[i + 1];
    if (statRatio <= x2) {
      return y1 + (y2 - y1) * (statRatio - x1) / (x2 - x1);
    }
  }
  return 0.5;
}

// 특수능력 effects 파싱 (BE에서 이미 배열로 오거나, 문자열로 오는 경우 모두 처리)
function parseEffects(effects: unknown): Array<{ effectType: string; effectOperator: string; effectAmount: number; targetScope: string }> {
  if (!effects) return [];
  if (Array.isArray(effects)) return effects;
  if (typeof effects === 'string') {
    try { const p = JSON.parse(effects); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

// DEV / Dev / DEVOPS / DevOps 를 모두 동일 타입으로 정규화
function normalizeSkillType(type: string): string {
  const upper = type.toUpperCase();
  return upper === 'DEV' || upper === 'DEVOPS' ? 'DEVOPS' : upper;
}

function getSkillIcon(type: string): string {
  const norm = normalizeSkillType(type).toLowerCase();
  return `${ASSET_BASE}/assets/003-01/${norm}.webp`;
}

const SKILL_ICON_STYLE: React.CSSProperties = { height: '1em', width: 'auto', verticalAlign: 'middle', imageRendering: 'pixelated', display: 'inline-block' };

function getCardStatForTypeSort(card: CardListItem, type: string): number {
  const norm = normalizeSkillType(type);
  let total = 0;
  if (normalizeSkillType(card.skill1.skillType) === norm) total += card.skill1.value;
  if (normalizeSkillType(card.skill2.skillType) === norm) total += card.skill2.value;
  if (normalizeSkillType(card.skill3.skillType) === norm) total += card.skill3.value;
  return total;
}

// filter='ALL' → 총합 기준, filter=스킬 → 해당 스킬 스탯 기준 정렬
function sortCardsByFilter(cards: CardListItem[], filter: string, order: 'desc' | 'asc'): CardListItem[] {
  return [...cards].sort((a, b) => {
    const valA = filter === 'ALL'
      ? a.skill1.value + a.skill2.value + a.skill3.value
      : getCardStatForTypeSort(a, filter);
    const valB = filter === 'ALL'
      ? b.skill1.value + b.skill2.value + b.skill3.value
      : getCardStatForTypeSort(b, filter);
    return order === 'desc' ? valB - valA : valA - valB;
  });
}

function sortCardsByGradeAndStat(cards: CardListItem[]): CardListItem[] {
  return [...cards].sort((a, b) => {
    const gradeA = GRADE_ORDER[a.grade] ?? 99;
    const gradeB = GRADE_ORDER[b.grade] ?? 99;
    if (gradeA !== gradeB) return gradeA - gradeB;
    const totalA = a.skill1.value + a.skill2.value + a.skill3.value;
    const totalB = b.skill1.value + b.skill2.value + b.skill3.value;
    return totalB - totalA;
  });
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
          src={`${ASSET_BASE}/assets/003-01/levelStar_000.webp`}
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
      src={`${ASSET_BASE}/assets/003-01/questCard_000.webp`}
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
function QuestDetail({ quest, isAccepting, isInProgress = false, isAllBusy = false, onAccept }: { quest: Quest | null; isAccepting: boolean; isInProgress?: boolean; isAllBusy?: boolean; onAccept: () => void }) {
  const { tutorialQuestStep: tqStep, tutorialAccessPage } = useGameStore();
  // step 3: 강화 안내 중이므로 절대 표시 안 함 / step 4, 41: 합성 전이므로 절대 표시 안 함
  const showTutorialArrow = tqStep !== null && quest !== null && !isInProgress && !isAllBusy
    && tqStep !== 3 && tqStep !== 4 && tqStep !== 41;
  // step 3: 강화 전이므로, step 4: 합성 전이므로 수락하기 비활성화 (스크립트 대기)
  const isTutorialAcceptDisabled = tqStep === 3 || tqStep === 4;
  if (!quest) {
    return (
      <div className="quest-detail-panel">
        <div className="quest-detail-empty">퀘스트를 선택해주세요</div>
      </div>
    );
  }

  return (
    <NineSliceBox
      src={`${ASSET_BASE}/assets/003-01/questInf_000.webp`}
      slice={[121, 248, 85, 248]}
      framePadding={24}
      borderScale={0.5}
      className="quest-detail-panel"
    >
      <div className="quest-detail-title">{quest.title}</div>

      {/* 퀘스트 내용 */}
      <NineSliceBox src={`${ASSET_BASE}/assets/003-01/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={20} borderScale={0.35} className="quest-info-box content-box">
        <div className="quest-info-box-label">퀘스트 내용</div>
        <div className="quest-info-box-text">{quest.description}</div>
      </NineSliceBox>

      {/* 수행 조건 + 예상 시간/보상 */}
      <div className="quest-detail-row">
        <NineSliceBox src={`${ASSET_BASE}/assets/003-01/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={20} borderScale={0.35} className="quest-info-box">
          <div className="quest-info-box-label">퀘스트 수행 조건</div>
          <div className="quest-info-box-text">
            <div>{quest.requiredSkillType1} / {quest.requiredSkillValue1}</div>
            <div>{quest.requiredSkillType2} / {quest.requiredSkillValue2}</div>
            <div>{quest.requiredSkillType3} / {quest.requiredSkillValue3}</div>
          </div>
        </NineSliceBox>

        <NineSliceBox src={`${ASSET_BASE}/assets/003-01/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={20} borderScale={0.35} className="quest-info-box">
          <div className="quest-info-box-label">예상 시간 / 보상</div>
          <div className="quest-info-box-text">
            <div>예상 시간 : {formatDuration(quest.durationMinutes)}</div>
            <div>예상 보상 : {quest.rewardGold.toLocaleString()}G</div>
          </div>
        </NineSliceBox>
      </div>

      {/* 수락하기 버튼 */}
      <div style={{ position: 'relative' }}>
        {showTutorialArrow && (
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
          src={`${ASSET_BASE}/assets/003-01/questCard_000.webp`}
          slice={[200, 208, 200, 208]}
          framePadding={10}
          borderScale={0.35}
          className="quest-accept-button"
          onClick={isTutorialAcceptDisabled ? undefined : onAccept}
          style={(isInProgress || isAllBusy || isTutorialAcceptDisabled) ? { filter: 'brightness(0.65)', cursor: 'default' } : undefined}
        >
          <span style={{ position: 'relative', zIndex: 2 }}>
            {isAccepting ? "수락 중..." : isInProgress ? "진행 중" : isAllBusy ? "근무 중" : "수락하기"}
          </span>
        </NineSliceBox>
      </div>
    </NineSliceBox>
  );
}

// --- Phase 2: 카드 배치 콘텐츠 ---
function Phase2Content({ quest, onCancel }: { quest: Quest | null, onCancel: () => void }) {
  const router = useRouter();
  const { selectingDeskId, startQuest, quests: storeQuests, tutorialQuestStep: tStep, tutorialEnhanceCount, tutorialAccessPage: tAccessPage } = useGameStore();
  const isTutorialPhase2 = tStep !== null && [2, 32, 42].includes(tStep);
  const { getAccessToken } = usePrivy();
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [usedCardWarning, setUsedCardWarning] = useState(false);
  const [showNoCardModal, setShowNoCardModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // --- 보유 카드 목록 (API) ---
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isCardLoading, setIsCardLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCnt, setTotalCnt] = useState<number | null>(null);

  // --- 필터 상태 ---
  const [capacitySort, setCapacitySort] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // --- BE 책상 템플릿 ID 매핑 ---
  const [beDeskTemplateId, setBeDeskTemplateId] = useState<number | null>(null);

  const getAuthToken = useCallback(async () => {
    // useUserStore.accessToken이 로그인 시 설정되는 실제 토큰 (gameStore.accessToken은 항상 null)
    return useUserStore.getState().accessToken || await getAccessToken();
  }, [getAccessToken]);

  // selectingDeskId (0-based FE index) → BE deskTemplateId 변환
  useEffect(() => {
    const fetchDeskId = async () => {
      try {
        const token = await getAuthToken();
        const { data: json } = await api.get('/api/v1/desks', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (json.success && Array.isArray(json.data)) {
          const sorted = [...json.data].sort((a: { deskTemplateId: number }, b: { deskTemplateId: number }) => a.deskTemplateId - b.deskTemplateId);
          const idx = selectingDeskId ?? 0;
          if (sorted[idx]) {
            setBeDeskTemplateId(sorted[idx].deskTemplateId);
          }
        }
      } catch (err) {
        console.error("책상 목록 조회 실패:", err);
      }
    };
    fetchDeskId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectingDeskId]);

  const fetchCards = useCallback(async (cursor?: string | null, filterOverride?: string) => {
    // 튜토리얼 모드: API 대신 store의 tutorialCards 사용
    if (tStep !== null) {
      setCards(useGameStore.getState().tutorialCards as unknown as CardListItem[]);
      setIsInitialLoad(false);
      return;
    }
    if (isCardLoading) return;
    setIsCardLoading(true);
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
        if (!cursor && newCards.length === 0) {
          setShowNoCardModal(true);
        }
      }
    } catch (err) {
      console.error("카드 목록 조회 실패:", err);
    } finally {
      setIsCardLoading(false);
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAuthToken, capacitySort, isTutorialPhase2]);

  useEffect(() => {
    setCards([]);
    setNextCursor(null);
    setHasMore(true);
    setP2ScrollRatio(0);
    setIsInitialLoad(true);
    fetchCards(null, capacitySort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacitySort]);

  // 선택된 필터 스탯 기준 오름/내림차순 정렬 (자동선택은 항상 등급+총합 기준 별도 정렬)
  const sortedCards = useMemo(() => sortCardsByFilter(cards, capacitySort, sortOrder), [cards, capacitySort, sortOrder]);
  const gradeOrderedCards = useMemo(() => sortCardsByGradeAndStat(cards), [cards]);

  // --- 사용 중인 카드 ---
  const [usedCardIds, setUsedCardIds] = useState<number[]>([]);

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
        console.error("사용 중인 카드 조회 실패:", err);
      }
    };
    fetchUsedCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 경고 메시지 ---
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [hardcapMessage, setHardcapMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // --- 퀘스트 요구 포지션 목록 ---
  const requirements = useMemo(() => {
    if (!quest) return [];
    return [
      { type: quest.requiredSkillType1, value: quest.requiredSkillValue1 },
      { type: quest.requiredSkillType2, value: quest.requiredSkillValue2 },
      { type: quest.requiredSkillType3, value: quest.requiredSkillValue3 },
    ].filter(r => r.type && r.value > 0);
  }, [quest]);

  // 퀘스트 요구 스킬 타입 Set (노란색 하이라이트용)
  const reqTypes = useMemo(() => new Set(requirements.map(r => normalizeSkillType(r.type))), [requirements]);

  // --- 선택된 카드 객체 목록 ---
  const selectedCardData = useMemo(() => {
    return selectedCards.map(id => sortedCards.find(c => c.cardId === id)).filter(Boolean) as CardListItem[];
  }, [selectedCards, sortedCards]);

  // --- 특정 스킬타입에 대한 선택된 카드들의 총합 스탯 ---
  const getStatTotal = useCallback((skillType: string): number => {
    const normalized = normalizeSkillType(skillType);
    return selectedCardData.reduce((sum, card) => {
      if (normalizeSkillType(card.skill1.skillType) === normalized) sum += card.skill1.value;
      if (normalizeSkillType(card.skill2.skillType) === normalized) sum += card.skill2.value;
      if (normalizeSkillType(card.skill3.skillType) === normalized) sum += card.skill3.value;
      return sum;
    }, 0);
  }, [selectedCardData]);

  // --- 특수능력 보너스 포함 실효 스탯 합산 ---
  const getEffectiveStatTotal = useCallback((skillType: string): number => {
    let total = getStatTotal(skillType);
    const normalized = normalizeSkillType(skillType);
    for (const card of selectedCardData) {
      const effects = parseEffects(card.specialAbility?.effects);
      for (const eff of effects) {
        if (eff.effectType === 'ALL_STATS_UP' && eff.effectOperator === 'FLAT') {
          total += eff.effectAmount;
        } else if (eff.effectType === 'MAX_STAT_UP' && eff.effectOperator === 'FLAT') {
          const cardStats = [card.skill1, card.skill2, card.skill3];
          const maxVal = Math.max(...cardStats.map(s => s.value));
          const maxStat = cardStats.find(s => s.value === maxVal);
          if (maxStat && normalizeSkillType(maxStat.skillType) === normalized) {
            total += eff.effectAmount;
          }
        }
      }
    }
    return total;
  }, [selectedCardData, getStatTotal]);

  // --- 시간 계산: MAX(기준시간 × 요구/합산) + 민캡 50% ---
  const calculateOverflowTime = useCallback((): number | null => {
    if (!quest || requirements.length === 0 || selectedCardData.length === 0) return null;
    const baseTime = quest.durationMinutes;

    let maxTime = 0;
    for (const req of requirements) {
      const total = getEffectiveStatTotal(req.type);
      if (total <= 0) return null;
      const statRatio = total / req.value;          // 배율: 1.0 = 딱 맞음, 2.0 = 2배 초과
      const posTime = baseTime * getTimeRatio(statRatio);
      if (posTime > maxTime) maxTime = posTime;
    }

    // 특수능력 시간 단축 적용 (QUEST_TOTAL_TIME_REDUCE)
    let timeMultiplier = 1.0;
    for (const card of selectedCardData) {
      const effects = parseEffects(card.specialAbility?.effects);
      for (const eff of effects) {
        if (eff.effectType === 'QUEST_TOTAL_TIME_REDUCE' && eff.effectOperator === 'PERCENT') {
          timeMultiplier -= eff.effectAmount / 100;
        }
      }
    }
    timeMultiplier = Math.max(0.5, timeMultiplier); // 하드캡 50% 이하 불가

    // 하드캡: 기준 시간의 50% (getTimeRatio가 보장하지만 안전망으로 유지)
    return Math.round(Math.max(maxTime * timeMultiplier, baseTime * 0.5) * 100) / 100;
  }, [quest, requirements, selectedCardData, getEffectiveStatTotal]);

  // --- 예상 시간 ---
  const estimatedTime = useMemo(() => calculateOverflowTime(), [calculateOverflowTime]);

  // --- 보상: 완벽주의자 특수능력 적용 ---
  const rewardInfo = useMemo(() => {
    const baseReward = quest?.rewardGold ?? 0;
    let multiplier = 100;
    for (const card of selectedCardData) {
      const effects = parseEffects(card.specialAbility?.effects);
      for (const eff of effects) {
        if (eff.effectType === 'QUEST_REWARD_GOLD' && eff.effectOperator === 'PERCENT') {
          multiplier += eff.effectAmount;
        }
      }
    }
    return { ratio: 1, multiplier: multiplier / 100, reward: Math.round(baseReward * multiplier / 100) };
  }, [quest, selectedCardData]);

  // --- 자동 선택: 최적 조합 탐색 (완전 탐색 + 그리디 fallback) ---
  const handleAutoSelect = useCallback(() => {
    if (!quest || requirements.length === 0) return;

    const getCardStat = (card: CardListItem, type: string): number => {
      const norm = normalizeSkillType(type);
      let total = 0;
      if (normalizeSkillType(card.skill1.skillType) === norm) total += card.skill1.value;
      if (normalizeSkillType(card.skill2.skillType) === norm) total += card.skill2.value;
      if (normalizeSkillType(card.skill3.skillType) === norm) total += card.skill3.value;
      return total;
    };

    const available = gradeOrderedCards.filter(c => !usedCardIds.includes(c.cardId));
    const minCards = Math.min(3, quest.cardSlotCount);
    const maxCards = quest.cardSlotCount;

    // 1. 후보 집합: 요구 스탯에 기여하는 모든 카드, 기여도 합산 오름차순 정렬
    //    (약한 카드도 포함해야 "B급 1장 + 보조 2장" 같은 최적 조합을 찾을 수 있음)
    const getRelevantScore = (card: CardListItem) =>
      requirements.reduce((s, r) => s + getCardStat(card, r.type), 0);

    const candidates = available
      .filter(c => getRelevantScore(c) > 0)
      .sort((a, b) => getRelevantScore(a) - getRelevantScore(b)); // 오름차순: 약한 카드 우선

    // 2. k장 조합 완전 탐색 + 가지치기
    //    오름차순 정렬 덕분에 bestScore 확정 후 부분합 >= bestScore 즉시 pruning
    let bestCombo: number[] | null = null;
    let bestScore = Infinity;

    const tryEnumerate = (k: number): boolean => {
      const combo: CardListItem[] = [];
      const pick = (start: number, partialScore: number) => {
        if (combo.length === k) {
          const valid = requirements.every(req =>
            combo.reduce((s, c) => s + getCardStat(c, req.type), 0) >= req.value
          );
          if (valid && partialScore < bestScore) {
            bestScore = partialScore;
            bestCombo = combo.map(c => c.cardId);
          }
          return;
        }
        const remaining = k - combo.length;
        for (let i = start; i <= candidates.length - remaining; i++) {
          const newScore = partialScore + getRelevantScore(candidates[i]);
          if (newScore >= bestScore) break; // 오름차순이므로 이후 카드는 더 큼 → 전체 prune
          combo.push(candidates[i]);
          pick(i + 1, newScore);
          combo.pop();
        }
      };
      pick(0, 0);
      return bestCombo !== null;
    };

    for (let k = minCards; k <= maxCards; k++) {
      if (tryEnumerate(k)) break; // 최소 카드 수로 충족되면 중단
    }

    // 3. fallback: 완전 탐색으로 충족 불가 시 그리디로 최선 시도
    if (!bestCombo) {
      const needs = requirements.map(r => ({ type: r.type, needed: r.value, current: 0 }));
      const autoSelected: number[] = [];
      const usedInAuto = new Set<number>();
      while (autoSelected.length < maxCards) {
        let bestCard: CardListItem | null = null;
        let bestCardScore = -1;
        for (const card of available) {
          if (usedInAuto.has(card.cardId)) continue;
          const needScore = needs.reduce((s, need) => {
            const stat = getCardStat(card, need.type);
            return s + Math.min(stat, Math.max(0, need.needed - need.current));
          }, 0);
          const totalStat = requirements.reduce((s, r) => s + getCardStat(card, r.type), 0);
          const cardScore = needScore * 100 + totalStat;
          if (cardScore > bestCardScore) { bestCardScore = cardScore; bestCard = card; }
        }
        if (!bestCard) break;
        autoSelected.push(bestCard.cardId);
        usedInAuto.add(bestCard.cardId);
        for (const need of needs) need.current += getCardStat(bestCard, need.type);
        if (needs.every(n => n.current >= n.needed) && autoSelected.length >= minCards) break;
      }
      bestCombo = autoSelected;
    }

    setSelectedCards(bestCombo);
    setWarningMessage(null);
    setHardcapMessage(null);
  }, [quest, requirements, gradeOrderedCards, usedCardIds]);

  // --- 카드 선택 (cardSlotCount 제한) ---
  const handleCardClick = (id: number) => {
    if (usedCardIds.includes(id)) {
      setUsedCardWarning(true);
      setTimeout(() => setUsedCardWarning(false), 2000);
      return;
    }
    setWarningMessage(null);
    setHardcapMessage(null);
    setSelectedCards(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      if (quest && prev.length >= quest.cardSlotCount) return prev;
      return [...prev, id];
    });
  };

  // --- 퀘스트 수락 (검증 후 API 호출) ---
  const handleAcceptQuest = useCallback(async () => {
    if (!quest || isStarting) return;

    // 튜토리얼 모드: API 생략, 책상 타이머 사용
    if (isTutorialPhase2) {
      const step = tStep!;
      const timerSec = step === 2 ? 3 : 5;
      const reward = step === 2 ? 500 : 0;
      const questTitle =
        step === 2 ? '시장조사를 하자' :
        step === 32 ? '프로젝트를 기획하자' :
        '프로젝트 프로토타입을 만들자';
      startQuest(0, timerSec, reward, questTitle, -step, 'sub');
      router.push('/');
      return;
    }

    // 카드 수 검증 (최소 3장, 최대 cardSlotCount) — 튜토리얼 step42: 1장으로 가능
    const minCards = tStep === 42 ? 1 : Math.min(3, quest.cardSlotCount);
    if (selectedCards.length < minCards) {
      setWarningMessage(`최소 ${minCards}장의 카드를 배치해야 합니다!`);
      return;
    }

    // 스탯 검증: 모든 포지션 합산 스탯 >= 요구 스탯 (특수능력 보너스 포함)
    for (const req of requirements) {
      const total = getEffectiveStatTotal(req.type);
      if (total < req.value) {
        setWarningMessage(`스탯이 부족합니다. (${req.type}: ${total} / ${req.value} 필요)`);
        return;
      }
    }

    // 책상(부서) 사용 가능 여부 사전 검증
    const deskIndex = selectingDeskId ?? 0;
    const deskStatus = storeQuests[deskIndex]?.status;
    if (deskStatus === 'IN_PROGRESS') {
      setWarningMessage('프로젝트를 시작할 수 있는 부서가 없습니다.');
      return;
    }

    setIsStarting(true);
    try {
      const token = await getAuthToken();
      const type = quest.isMain ? 'main' : 'sub';
      const targetDeskId = beDeskTemplateId ?? (selectingDeskId !== null ? selectingDeskId + 1 : 1);
      const durationSeconds = Math.min(estimatedTime ?? quest.durationMinutes, quest.durationMinutes);

      const res = await api.post(`/api/v1/quests/${type}/${quest.questId}/start`, {
        deskId: targetDeskId,
        cardIds: selectedCards,
        duration: Math.round(durationSeconds),  // 소요 시간 (초) — BE가 초 단위로 제공
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data?.success) {
        console.error("퀘스트 시작 응답:", res.data);
        throw new Error(res.data?.message || '퀘스트 시작 실패');
      }

      // GA: 퀘스트 배치 성공
      sendGAEvent("quest_assign", {
        quest_type: type,
        quest_title: quest.title,
        card_count: selectedCards.length,
        reward_gold: rewardInfo.reward,
      });

      // FE 인덱스(0~4)로 store 업데이트, BE 템플릿 ID(1~5)와 혼용 방지
      const feDeskIndex = selectingDeskId ?? 0;
      const userQuestId = res.data.data as number;
      startQuest(feDeskIndex, durationSeconds, rewardInfo.reward, quest.title, userQuestId, type as 'main' | 'sub');
      router.push('/');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string; code?: string; error?: { message?: string; code?: string } } }; message?: string };
      const errData = e.response?.data;
      console.error("퀘스트 시작 실패:", e.response?.status, errData, {
        deskId: selectingDeskId,
        cardIds: selectedCards,
        questId: quest.questId,
        isMain: quest.isMain,
      });
      const errCode = errData?.error?.code || errData?.code;
      if (errCode === 'Q006') {
        setHardcapMessage(`프로젝트에 진행할 인원들의 능력치가 생각보다 낮습니다. ${formatDuration(quest.durationMinutes * 2)}을 뛰어 넘어야 퀘스트 수주가 가능합니다!`);
      } else if (errCode === 'Q007') {
        setWarningMessage('프로젝트를 시작할 수 있는 부서가 없습니다.');
      } else {
        const msg = errData?.error?.message || errData?.error?.code || errData?.message || errData?.code || e.message || '알 수 없는 오류';
        setWarningMessage(`퀘스트 시작 실패: ${msg}`);
      }
    } finally {
      setIsStarting(false);
    }
  }, [quest, isStarting, selectedCards, requirements, getEffectiveStatTotal, getAuthToken, estimatedTime, selectingDeskId, startQuest, rewardInfo.reward, router]);

  const [p2ScrollRatio, setP2ScrollRatio] = useState(0);
  const [p2TrackHeight, setP2TrackHeight] = useState(0);
  const [p2WrapperHeight, setP2WrapperHeight] = useState(0);
  const [p2GridHeight, setP2GridHeight] = useState(0);
  const p2GridRef = useRef<HTMLDivElement>(null);
  const p2TrackRef = useRef<HTMLDivElement>(null);
  const p2WrapperRef = useRef<HTMLDivElement>(null);
  const isDraggingP2Ref = useRef(false);
  const dragStartP2YRef = useRef(0);
  const dragStartP2RatioRef = useRef(0);
  // Phase2 스와이프 스크롤
  const swipe2StartYRef = useRef(0);
  const isSwipe2Ref = useRef(false);
  const swipe2MovedRef = useRef(false);
  const swipe2VelocityRef = useRef(0);
  const swipe2LastTimeRef = useRef(0);
  const momentum2AnimRef = useRef<number | null>(null);

  // 실제 DOM 높이 기반으로 계산 (하드코딩 제거)
  const p2MaxScroll = Math.max(0, p2GridHeight - p2WrapperHeight);
  const p2ScrollOffset = p2ScrollRatio * p2MaxScroll;
  // 네이티브 이벤트 핸들러에서 최신 p2MaxScroll을 참조하기 위한 ref

  // 스크롤 하단 도달 시 다음 페이지 로드
  useEffect(() => {
    if (p2ScrollRatio > 0.9 && hasMore && !isCardLoading && nextCursor) {
      fetchCards(nextCursor, capacitySort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2ScrollRatio, hasMore, isCardLoading, nextCursor]);

  const handleP2Wheel = useCallback((e: React.WheelEvent) => {
    if (p2MaxScroll <= 0) return;
    const delta = e.deltaY / p2MaxScroll;
    setP2ScrollRatio(prev => Math.min(1, Math.max(0, prev + delta * 0.7)));
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
    const measure = () => {
      if (p2TrackRef.current) setP2TrackHeight(p2TrackRef.current.clientHeight);
      if (p2WrapperRef.current) setP2WrapperHeight(p2WrapperRef.current.clientHeight);
      if (p2GridRef.current) setP2GridHeight(p2GridRef.current.scrollHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    const timer = setTimeout(measure, 100);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(timer);
    };
  }, [cards, quest]); // cards 로드/추가 시 재측정 + quest DOM 렌더링 시 재측정

  const handleP2ThumbPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingP2Ref.current = true;
    dragStartP2YRef.current = e.clientY;
    dragStartP2RatioRef.current = p2ScrollRatio;
  }, [p2ScrollRatio]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
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
    const handlePointerUp = () => { isDraggingP2Ref.current = false; };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
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
    <>
      {/* ──── 카드 미소지 안내 모달 ──── */}
      {showNoCardModal && mounted && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 font-dot pointer-events-auto">
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-10 text-center max-w-md shadow-[8px_8px_0px_#4a5d73]">
            <p className="text-2xl mb-8 leading-relaxed text-slate-900 font-bold">
              소지한 카드가 없습니다.<br />뽑기를 진행해주세요.
            </p>
            <button
              onClick={() => { setShowNoCardModal(false); router.push('/gacha'); }}
              className="w-full py-4 bg-[#ffcc00] text-black border-b-4 border-r-4 border-[#cc9900] active:border-0 active:translate-y-1 transition-all font-bold text-xl"
            >
              확인
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ──── 좌측: 카드 목록 (card-list 레이아웃 통일) ──── */}
      <div className="phase2-left-col">
        {/* 스킬 필터 드롭다운 + 정렬 버튼 */}
        <div className="quest-filters">
          <div className="quest-select-wrapper">
            <select
              className="quest-select"
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

        {tStep !== null && selectedCards.length < (tStep === 42 ? 1 : Math.min(3, quest?.cardSlotCount ?? 3)) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.5cqw' }}>
            <img
              src={`${ASSET_BASE}/assets/tutorial/arrow.webp`}
              alt=""
              className="tutorial-arrow-y"
              style={{ display: 'block', height: '4.7cqw', width: 'auto', imageRendering: 'pixelated', pointerEvents: 'none' }}
            />
            <span style={{ color: '#ffd700', fontSize: '1.3cqw', fontWeight: 'bold', textShadow: '1px 1px 0 #000', whiteSpace: 'nowrap' }}>
              {tStep === 42 ? 1 : Math.min(3, quest?.cardSlotCount ?? 3)}장 선택하세요
            </span>
          </div>
        )}
        <NineSliceBox src={`${ASSET_BASE}/assets/003-02/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={24} borderScale={0.5} className="phase2-left-box">
          <div
            className="phase2-card-grid-wrapper"
            ref={p2WrapperRef}
            onWheel={handleP2Wheel}
            style={{ flex: 1, overflow: 'hidden' }}
            onPointerDown={(e) => {
              if (p2MaxScroll <= 0) return;
              if (momentum2AnimRef.current !== null) { cancelAnimationFrame(momentum2AnimRef.current); momentum2AnimRef.current = null; }
              isSwipe2Ref.current = true;
              swipe2MovedRef.current = false;
              swipe2StartYRef.current = e.clientY;
              swipe2VelocityRef.current = 0;
              swipe2LastTimeRef.current = performance.now();
            }}
            onPointerMove={(e) => {
              if (!isSwipe2Ref.current || p2MaxScroll <= 0) return;
              const now = performance.now();
              const dt = Math.max(8, now - swipe2LastTimeRef.current);
              const gameScale = parseFloat(document.documentElement.style.getPropertyValue('--game-scale')) || 1;
              const rawDelta = swipe2StartYRef.current - e.clientY;
              if (Math.abs(rawDelta) > 2) swipe2MovedRef.current = true;
              swipe2VelocityRef.current = rawDelta * (16 / dt);
              swipe2StartYRef.current = e.clientY;
              swipe2LastTimeRef.current = now;
              setP2ScrollRatio(prev => Math.min(1, Math.max(0, prev + (rawDelta / gameScale) / p2MaxScroll)));
            }}
            onPointerUp={() => {
              if (!isSwipe2Ref.current) return;
              isSwipe2Ref.current = false;
              const capturedMax = p2MaxScroll;
              const gameScale = parseFloat(document.documentElement.style.getPropertyValue('--game-scale')) || 1;
              let v = swipe2VelocityRef.current / gameScale;
              const animate = () => {
                v *= 0.90;
                if (Math.abs(v) < 0.3 || capturedMax <= 0) { momentum2AnimRef.current = null; swipe2MovedRef.current = false; return; }
                setP2ScrollRatio(prev => Math.min(1, Math.max(0, prev + v / capturedMax)));
                momentum2AnimRef.current = requestAnimationFrame(animate);
              };
              if (Math.abs(v) > 0.5) { momentum2AnimRef.current = requestAnimationFrame(animate); } else { swipe2MovedRef.current = false; }
            }}
            onPointerCancel={() => {
              isSwipe2Ref.current = false;
              swipe2MovedRef.current = false;
              if (momentum2AnimRef.current !== null) { cancelAnimationFrame(momentum2AnimRef.current); momentum2AnimRef.current = null; }
            }}
            onClickCapture={(e) => { if (swipe2MovedRef.current) { e.stopPropagation(); swipe2MovedRef.current = false; } }}
          >
            <div className="phase2-card-grid" ref={p2GridRef} style={{ transform: `translateY(-${p2ScrollOffset}px)` }}>
              {isInitialLoad ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#8a8ab0', fontFamily: "'StardustS', 'Stardust', sans-serif", fontSize: 16 }}>
                  로딩 중...
                </div>
              ) : sortedCards.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#8a8ab0', fontFamily: "'StardustS', 'Stardust', sans-serif", fontSize: 16 }}>
                  보유 카드가 없습니다
                </div>
              ) : (
                sortedCards.map((card) => {
                  const selected = selectedCards.includes(card.cardId);
                  const isUsed = usedCardIds.includes(card.cardId);
                  return (
                    <div
                      key={card.cardId}
                      className={`phase2-card-item ${selected ? 'selected' : ''}`}
                      data-grade={card.grade}
                      onClick={() => handleCardClick(card.cardId)}
                      style={{ filter: isUsed ? 'brightness(0.5)' : undefined, cursor: isUsed ? 'not-allowed' : undefined }}
                    >
                      <img src={card.imageUrl} alt={card.name} draggable={false} />
                      {card.enhanceSuccessCount > 0 && (
                        <span className="card-enhance-badge" data-level={String(card.enhanceSuccessCount)} data-grade={card.grade}>
                          <span className="badge-plus">+</span><span className="badge-num">{card.enhanceSuccessCount}</span>
                        </span>
                      )}
                      {selected && <span className="card-check-overlay">✓</span>}
                      <span className="phase2-card-stat stat-1" style={{ color: reqTypes.has(normalizeSkillType(card.skill1.skillType)) ? '#ffcc00' : undefined }}><img src={getSkillIcon(card.skill1.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                      <span className="phase2-card-stat stat-2" style={{ color: reqTypes.has(normalizeSkillType(card.skill2.skillType)) ? '#ffcc00' : undefined }}><img src={getSkillIcon(card.skill2.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                      <span className="phase2-card-stat stat-3" style={{ color: reqTypes.has(normalizeSkillType(card.skill3.skillType)) ? '#ffcc00' : undefined }}><img src={getSkillIcon(card.skill3.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
                    </div>
                  );
                })
              )}
              {isCardLoading && !isInitialLoad && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 20, color: '#8a8ab0', fontFamily: "'StardustS', 'Stardust', sans-serif", fontSize: 14 }}>
                  더 불러오는 중...
                </div>
              )}
            </div>
          </div>
        </NineSliceBox>

        {/* 사용 중 카드 경고 (왼쪽 카드 목록 위 오버레이) */}
        {usedCardWarning && (
          <div className="phase2-warning-overlay">
            <div className="phase2-warning-text">이미 퀘스트에서 사용 중인 카드입니다.</div>
          </div>
        )}
      </div>

      {/* ──── 중간: 스크롤바 ──── */}
      <div className="scrollbar-column phase2-scrollbar-column">
        <div ref={p2TrackRef} className="scrollbar-track" onClick={handleP2TrackClick}>
          <div className="scrollbar-thumb" style={{ top: p2ThumbTop() }} onPointerDown={handleP2ThumbPointerDown} />
        </div>
      </div>

      {/* ──── 우측: 퀘스트 프레임 ──── */}
      <NineSliceBox src={`${ASSET_BASE}/assets/003-02/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={20} borderScale={0.5} className="phase2-right-box">
        {/* 퀘스트 제목 + 카드 배치 현황판 (합쳐진 박스) */}
        <NineSliceBox src={`${ASSET_BASE}/assets/003-02/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="phase2-right-drop-box">
          <div className="phase2-info-title">{quest.title}</div>
          <div className="phase2-info-subtitle">카드 배치 : {selectedCards.length} / {quest.cardSlotCount}장</div>
          <div className="phase2-drop-cards">
            {(() => {
              const total = quest.cardSlotCount;
              const cardWidth = total <= 3 ? 110 : total === 4 ? 95 : 82;
              const overlap = total <= 3 ? -25 : total === 4 ? -30 : -35;
              const fanAngle = total <= 3 ? 10 : total === 4 ? 8 : 6;
              const yMultiplier = total <= 3 ? 10 : total === 4 ? 8 : 6;
              return Array.from({ length: total }).map((_, index) => {
                const cardId = selectedCards[index];
                const card = cardId ? sortedCards.find(c => c.cardId === cardId) : null;
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
                    <div key={`slot-${index}`} className="phase2-fan-card phase2-fan-placeholder" style={style}>
                      <div className="phase2-placeholder-inner">?</div>
                    </div>
                  );
                }
                return (
                  <div key={card.cardId} className="phase2-fan-card" style={style} onClick={() => handleCardClick(card.cardId)}>
                    <img src={card.imageUrl} alt={card.name} draggable={false} />
                    <span className="phase2-fan-stat stat-1" style={{ color: reqTypes.has(normalizeSkillType(card.skill1.skillType)) ? '#ffcc00' : undefined }}><img src={getSkillIcon(card.skill1.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                    <span className="phase2-fan-stat stat-2" style={{ color: reqTypes.has(normalizeSkillType(card.skill2.skillType)) ? '#ffcc00' : undefined }}><img src={getSkillIcon(card.skill2.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                    <span className="phase2-fan-stat stat-3" style={{ color: reqTypes.has(normalizeSkillType(card.skill3.skillType)) ? '#ffcc00' : undefined }}><img src={getSkillIcon(card.skill3.skillType)} alt="" style={SKILL_ICON_STYLE} /> {displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
                  </div>
                );
              });
            })()}
            {/* 경고 메시지 — 카드 위 오버레이 */}
            {(warningMessage || hardcapMessage) && (
              <div className="phase2-warning-overlay">
                <div className={`phase2-warning-text${hardcapMessage ? ' hardcap' : ''}`}>
                  {hardcapMessage || warningMessage}
                </div>
              </div>
            )}
          </div>
        </NineSliceBox>

        {/* Bottom: 수행 조건 + 예상 시간/보상 */}
        <div className="phase2-right-bottom-row">
          <NineSliceBox src={`${ASSET_BASE}/assets/003-02/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="phase2-info-box">
            <div className="quest-info-box-label">퀘스트 수행 조건</div>
            <div className="quest-info-box-text">
              {requirements.map((req) => {
                const current = getEffectiveStatTotal(req.type);
                const meetsMin = current >= req.value;
                return (
                  <div key={req.type} style={{ color: meetsMin ? '#111' : '#ff4444' }}>
                    {req.type} : {current} / {req.value}
                  </div>
                );
              })}
            </div>
          </NineSliceBox>
          <NineSliceBox src={`${ASSET_BASE}/assets/003-02/questInf_001.webp`} slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="phase2-info-box">
            <div className="quest-info-box-label">예상 시간 / 보상</div>
            <div className="quest-info-box-text">
              <div>예상 시간 : {formatDuration(estimatedTime ?? quest.durationMinutes)}</div>
              <div>예상 보상 : {rewardInfo.reward.toLocaleString()}G</div>
            </div>
          </NineSliceBox>
        </div>

        {/* 취소하기 / 자동 선택 / 수락하기 버튼 */}
        <div className="phase2-action-buttons">
          <NineSliceBox
            src={`${ASSET_BASE}/assets/003-01/questCard_000.webp`}
            slice={[200, 208, 200, 208]}
            framePadding={14}
            borderScale={0.4}
            className="phase2-btn-cancel"
            onClick={onCancel}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>취소하기</span>
          </NineSliceBox>

          {!isTutorialPhase2 && (
            <NineSliceBox
              src={`${ASSET_BASE}/assets/003-01/questCard_000.webp`}
              slice={[200, 208, 200, 208]}
              framePadding={14}
              borderScale={0.4}
              className="phase2-btn-auto"
              onClick={handleAutoSelect}
            >
              <span style={{ position: 'relative', zIndex: 2 }}>자동 선택</span>
            </NineSliceBox>
          )}

          <div style={{ position: 'relative' }}>
            {(() => {
              const minCards = tStep === 42 ? 1 : Math.min(3, quest.cardSlotCount);
              const enhanceDone = tStep !== 32 || tutorialEnhanceCount >= 3;
              const showArrow = tStep !== null && enhanceDone && (
                selectedCards.length >= minCards
                || (tStep === 32 && tAccessPage === 'quest')
                || (tStep === 42 && tAccessPage === 'quest')
              );
              return showArrow ? (
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
              ) : null;
            })()}
            {(() => {
              const minCards = tStep === 42 ? 1 : Math.min(3, quest.cardSlotCount);
              const isPhase2Disabled = (tStep === 32 && tutorialEnhanceCount < 3);
              const isCardInsufficient = selectedCards.length < minCards;
              return (
            <NineSliceBox
              src={`${ASSET_BASE}/assets/003-01/questCard_000.webp`}
              slice={[200, 208, 200, 208]}
              framePadding={14}
              borderScale={0.4}
              className={`phase2-btn-accept ${(isCardInsufficient || isPhase2Disabled) ? 'disabled' : ''}`}
              onClick={isPhase2Disabled ? undefined : handleAcceptQuest}
            >
              <span style={{ position: 'relative', zIndex: 2 }}>
                {isStarting ? '시작 중...' : '수락하기'}
              </span>
            </NineSliceBox>
              );
            })()}
          </div>
        </div>

      </NineSliceBox>
    </>
  );
}

/* ============================================================
   메인 페이지 컴포넌트
   ============================================================ */
export default function QuestPage() {
  const { getAccessToken } = usePrivy();
  const { quests: storeQuests, tutorialQuestStep, tutorialAccessPage, setTutorialScriptId } = useGameStore();
  const isTutorialMode = tutorialQuestStep !== null && [2, 3, 32, 4, 42].includes(tutorialQuestStep);

  const tutorialQuestDef =
    (tutorialQuestStep === 2) ? TUTORIAL_QUEST_2 :
    (tutorialQuestStep === 3 || tutorialQuestStep === 32) ? TUTORIAL_QUEST_3 :
    (tutorialQuestStep === 4 || tutorialQuestStep === 42) ? TUTORIAL_QUEST_4 :
    null;

  // store에서 현재 IN_PROGRESS/COMPLETED 퀘스트의 questId/title Set 계산
  const activeQuestIds = new Set(
    storeQuests
      .filter(q => (q.status === 'IN_PROGRESS' || q.status === 'COMPLETED') && q.questId != null)
      .map(q => q.questId as number)
  );
  const activeQuestTitles = new Set(
    storeQuests
      .filter(q => (q.status === 'IN_PROGRESS' || q.status === 'COMPLETED') && q.title != null)
      .map(q => q.title as string)
  );

  // 해금된 데스크 중 수행 가능한 슬롯이 있는지 확인
  const allDesksBusy = storeQuests
    .filter(q => !q.isLocked)
    .every(q => q.status === 'IN_PROGRESS' || q.status === 'COMPLETED');

  const [phase, setPhase] = useState<'select' | 'placement'>('select');
  const [mainQuest, setMainQuest] = useState<Quest | null>(null);
  const [subQuests, setSubQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showInProgressModal, setShowInProgressModal] = useState(false);
  const [showAllBusyModal, setShowAllBusyModal] = useState(false);

  // --- 인증 토큰 가져오기 ---
  const getAuthToken = useCallback(async () => {
    // useUserStore.accessToken이 로그인 시 설정되는 실제 토큰 (gameStore.accessToken은 항상 null)
    return useUserStore.getState().accessToken || await getAccessToken();
  }, [getAccessToken]);

  // --- 메인 퀘스트 조회 ---
  const fetchMainQuest = useCallback(async (chapter: number) => {
    try {
      const token = await getAuthToken();
      const { data: json } = await api.get('/api/v1/quests/main', {
        params: { chapterNumber: chapter },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (json.success && json.data && Array.isArray(json.data) && json.data.length > 0) {
        // stepNo 오름차순 정렬 후 COMPLETED가 아닌 첫 번째 퀘스트 선택
        const sorted: MainQuestData[] = [...json.data].sort((a, b) => a.stepNo - b.stepNo);
        const current = sorted.find(d => d.status !== 'COMPLETED' && d.status !== 'CLAIMED') ?? sorted[sorted.length - 1];

        const quest: Quest = {
          questId: current.questId,
          title: current.title,
          description: current.description,
          difficulty: current.difficulty,
          requiredSkillType1: current.requiredSkillType1,
          requiredSkillValue1: current.requiredSkillValue1,
          requiredSkillType2: current.requiredSkillType2,
          requiredSkillValue2: current.requiredSkillValue2,
          requiredSkillType3: current.requiredSkillType3,
          requiredSkillValue3: current.requiredSkillValue3,
          durationMinutes: current.durationMinutes,
          cardSlotCount: current.cardSlotCount,
          rewardGold: current.rewardGold,
          isMain: true,
        };
        setMainQuest(quest);
        setSelectedQuest(quest);
        setChapterNumber(current.chapterNo);
      }
    } catch (err) {
      console.error("메인 퀘스트 조회 실패:", err);
    }
  }, [getAuthToken]);

  // --- 서브 퀘스트 목록 조회 ---
  const fetchSubQuests = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const { data: json } = await api.get('/api/v1/quests/sub', {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    if (tutorialQuestStep !== null) {
      // 튜토리얼 활성 중: API 호출 금지, mock 퀘스트만 사용
      if (tutorialQuestDef) {
        const q: Quest = { ...tutorialQuestDef };
        setSubQuests([q]);
        setMainQuest(null);
        setSelectedQuest(q);
      }
      setIsLoading(false);
      return;
    }
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchMainQuest(chapterNumber), fetchSubQuests()]);
      setIsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTutorialMode, tutorialQuestStep]);

  // 튜토리얼 step3/4: 퀘스트 페이지 진입 시 스크립트 표시
  useEffect(() => {
    if (tutorialQuestStep === 3 && tutorialAccessPage === 'quest') {
      const timer = setTimeout(() => {
        setTutorialScriptId('step3_hard');
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (tutorialQuestStep === 4 && tutorialAccessPage === 'quest') {
      const timer = setTimeout(() => {
        setTutorialScriptId('step4_missing');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tutorialQuestStep, tutorialAccessPage, setTutorialScriptId]);

  // --- 퀘스트 수락 ---
  const handleAcceptQuest = useCallback(() => {
    if (!selectedQuest) return;
    // 모든 데스크 사용 중
    if (allDesksBusy) {
      setShowAllBusyModal(true);
      return;
    }
    // 이미 진행 중인 퀘스트면 모달 표시 (questId 또는 title 일치)
    if (activeQuestIds.has(selectedQuest.questId) || activeQuestTitles.has(selectedQuest.title)) {
      setShowInProgressModal(true);
      return;
    }
    setPhase('placement');
  }, [selectedQuest, activeQuestIds, activeQuestTitles, allDesksBusy]);

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
  const [questListHeight, setQuestListHeight] = useState(0);
  const [questWrapperHeight, setQuestWrapperHeight] = useState(0);
  const subQuestListRef = useRef<HTMLDivElement>(null);
  const subQuestWrapperRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartRatioRef = useRef(0);
  // 스와이프 스크롤
  const swipe1StartYRef = useRef(0);
  const isSwipe1Ref = useRef(false);
  const swipe1MovedRef = useRef(false);
  const swipe1VelocityRef = useRef(0);
  const swipe1LastTimeRef = useRef(0);
  const momentum1AnimRef = useRef<number | null>(null);

  // 실제 DOM 높이 기반으로 계산 (하드코딩 제거)
  const maxScroll = Math.max(0, questListHeight - questWrapperHeight);
  const scrollOffset = scrollRatio * maxScroll;

  useEffect(() => {
    const measure = () => {
      if (scrollTrackRef.current) setTrackHeight(scrollTrackRef.current.clientHeight);
      if (subQuestListRef.current) setQuestListHeight(subQuestListRef.current.scrollHeight);
      if (subQuestWrapperRef.current) setQuestWrapperHeight(subQuestWrapperRef.current.clientHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    const timer = setTimeout(measure, 100);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(timer);
    };
  }, [subQuests]);

  const getThumbTop = useCallback(() => {
    if (!trackHeight) return 0;
    const thumbSize = 100;
    const trackPadding = -5;
    const maxThumbTop = trackHeight - thumbSize - (trackPadding * 2);
    if (maxThumbTop <= 0) return trackPadding;
    return trackPadding + (scrollRatio * maxThumbTop);
  }, [scrollRatio, trackHeight]);

  const handleThumbPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      dragStartYRef.current = e.clientY;
      dragStartRatioRef.current = scrollRatio;
    },
    [scrollRatio]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !scrollTrackRef.current) return;
      const trackHeightCurrent = scrollTrackRef.current.clientHeight;
      const thumbSize = 100;
      const trackPadding = -5;
      const maxThumbTop = trackHeightCurrent - thumbSize - (trackPadding * 2);
      if (maxThumbTop <= 0) return;

      const deltaY = e.clientY - dragStartYRef.current;
      const deltaRatio = deltaY / maxThumbTop;
      const newRatio = Math.min(1, Math.max(0, dragStartRatioRef.current + deltaRatio));
      setScrollRatio(newRatio);
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!scrollTrackRef.current) return;
      const rect = scrollTrackRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const trackHeightCurrent = rect.height;
      const thumbSize = 100;
      const trackPadding = -5;
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
      setScrollRatio((prev) => Math.min(1, Math.max(0, prev + delta * 0.7)));
    },
    [maxScroll]
  );

  return (
    <div className="quest-page-container">

      {/* 상단 타이틀 */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <NineSliceBox
          src={`${ASSET_BASE}/assets/003-01/questCard_000.webp`}
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
        <div className="quest-content phase-1-content" style={{ pointerEvents: phase === 'placement' ? 'none' : 'auto' }}>
          {/* ──── 좌측: 퀘스트 리스트 ──── */}
          <div className="quest-left-area" onWheel={handleWheel}>
            <div className="quest-list-column">
              {/* 메인 퀘스트 (튜토리얼 모드에서는 숨김) */}
              {!isTutorialMode && (mainQuest ? (
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
              ))}

              {/* 서브 퀘스트 (스크롤 영역) */}
              <div
                ref={subQuestWrapperRef}
                className="sub-quest-scroll-area"
                onPointerDown={(e) => {
                  if (maxScroll <= 0) return;
                  if (momentum1AnimRef.current !== null) { cancelAnimationFrame(momentum1AnimRef.current); momentum1AnimRef.current = null; }
                  isSwipe1Ref.current = true;
                  swipe1MovedRef.current = false;
                  swipe1StartYRef.current = e.clientY;
                  swipe1VelocityRef.current = 0;
                  swipe1LastTimeRef.current = performance.now();
                }}
                onPointerMove={(e) => {
                  if (!isSwipe1Ref.current || maxScroll <= 0) return;
                  const now = performance.now();
                  const dt = Math.max(8, now - swipe1LastTimeRef.current);
                  const gameScale = parseFloat(document.documentElement.style.getPropertyValue('--game-scale')) || 1;
                  const rawDelta = swipe1StartYRef.current - e.clientY;
                  if (Math.abs(rawDelta) > 2) swipe1MovedRef.current = true;
                  swipe1VelocityRef.current = rawDelta * (16 / dt);
                  swipe1StartYRef.current = e.clientY;
                  swipe1LastTimeRef.current = now;
                  setScrollRatio(prev => Math.min(1, Math.max(0, prev + (rawDelta / gameScale) / maxScroll)));
                }}
                onPointerUp={() => {
                  if (!isSwipe1Ref.current) return;
                  isSwipe1Ref.current = false;
                  const capturedMax = maxScroll;
                  const gameScale = parseFloat(document.documentElement.style.getPropertyValue('--game-scale')) || 1;
                  let v = swipe1VelocityRef.current / gameScale;
                  const animate = () => {
                    v *= 0.90;
                    if (Math.abs(v) < 0.3 || capturedMax <= 0) { momentum1AnimRef.current = null; swipe1MovedRef.current = false; return; }
                    setScrollRatio(prev => Math.min(1, Math.max(0, prev + v / capturedMax)));
                    momentum1AnimRef.current = requestAnimationFrame(animate);
                  };
                  if (Math.abs(v) > 0.5) { momentum1AnimRef.current = requestAnimationFrame(animate); } else { swipe1MovedRef.current = false; }
                }}
                onPointerCancel={() => {
                  isSwipe1Ref.current = false;
                  swipe1MovedRef.current = false;
                  if (momentum1AnimRef.current !== null) { cancelAnimationFrame(momentum1AnimRef.current); momentum1AnimRef.current = null; }
                }}
                onClickCapture={(e) => { if (swipe1MovedRef.current) { e.stopPropagation(); swipe1MovedRef.current = false; } }}
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
                onPointerDown={handleThumbPointerDown}
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
                    ? "/assets/003-01/refreshButton_001.webp"
                    : `${ASSET_BASE}/assets/003-01/refreshButton_000.webp`
                }
                alt="새로고침"
                draggable={false}
              />
            </button>
          </div>

          {/* ──── 우측: 퀘스트 상세 정보 ──── */}
          <QuestDetail
            quest={selectedQuest}
            isAccepting={false}
            isInProgress={selectedQuest ? (activeQuestIds.has(selectedQuest.questId) || activeQuestTitles.has(selectedQuest.title)) : false}
            isAllBusy={allDesksBusy}
            onAccept={handleAcceptQuest}
          />
        </div>

        {/* === Phase 2: 카드 배치 화면 === */}
        <div className="quest-content phase-2-content" style={{ pointerEvents: phase === 'select' ? 'none' : 'auto' }}>
          <Phase2Content quest={selectedQuest} onCancel={() => setPhase('select')} />
        </div>
      </div>

      {/* ──── 이미 진행 중인 퀘스트 모달 (portal: container-type 우회) ──── */}
      {showInProgressModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 font-dot pointer-events-auto">
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-8 text-center max-w-sm shadow-[4px_4px_0px_#4a5d73]">
            <p className="text-xl mb-6 font-bold text-slate-800">현재 진행 중인 퀘스트입니다.</p>
            <button
              onClick={() => setShowInProgressModal(false)}
              className="px-8 py-2 bg-[#ffcc00] text-black border-b-2 border-r-2 border-[#cc9900] active:border-0 active:translate-y-0.5 transition-all text-xl font-bold"
            >
              확인
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ──── 모든 직원 근무 중 모달 ──── */}
      {showAllBusyModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 font-dot pointer-events-auto">
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-8 text-center max-w-sm shadow-[4px_4px_0px_#4a5d73]">
            <p className="text-xl mb-6 font-bold text-slate-800">현재 모든 직원들이 근무 중입니다.</p>
            <button
              onClick={() => setShowAllBusyModal(false)}
              className="px-8 py-2 bg-[#ffcc00] text-black border-b-2 border-r-2 border-[#cc9900] active:border-0 active:translate-y-0.5 transition-all text-xl font-bold"
            >
              확인
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
