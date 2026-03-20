"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import api from "@/lib/axios";
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
  specialAbility: { name: string; description: string; effects: string } | null;
}

const GRADE_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

function displaySkillType(type: string): string {
  return type.toUpperCase() === 'DEVOPS' ? 'DEV' : type.toUpperCase();
}

// DEV / Dev / DEVOPS / DevOps 를 모두 동일 타입으로 정규화
function normalizeSkillType(type: string): string {
  const upper = type.toUpperCase();
  return upper === 'DEV' || upper === 'DEVOPS' ? 'DEVOPS' : upper;
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
function QuestDetail({ quest, isAccepting, isInProgress = false, onAccept }: { quest: Quest | null; isAccepting: boolean; isInProgress?: boolean; onAccept: () => void }) {
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
            <div>예상 시간 : {quest.durationMinutes}분</div>
            <div>예상 보상 : {quest.rewardGold.toLocaleString()}G</div>
          </div>
        </NineSliceBox>
      </div>

      {/* 수락하기 버튼 */}
      <NineSliceBox
        src={`${ASSET_BASE}/assets/003-01/questCard_000.webp`}
        slice={[200, 208, 200, 208]}
        framePadding={10}
        borderScale={0.35}
        className="quest-accept-button"
        onClick={onAccept}
        style={isInProgress ? { filter: 'brightness(0.65)', cursor: 'default' } : undefined}
      >
        <span style={{ position: 'relative', zIndex: 2 }}>
          {isAccepting ? "수락 중..." : isInProgress ? "진행 중" : "수락하기"}
        </span>
      </NineSliceBox>
    </NineSliceBox>
  );
}

// --- Phase 2: 카드 배치 콘텐츠 ---
function Phase2Content({ quest, onCancel, onShowUsedCardModal }: { quest: Quest | null, onCancel: () => void, onShowUsedCardModal: () => void }) {
  const router = useRouter();
  const { selectingDeskId, startQuest, accessToken, quests: storeQuests } = useGameStore();
  const { getAccessToken } = usePrivy();
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  // --- 보유 카드 목록 (API) ---
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isCardLoading, setIsCardLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // --- BE 책상 템플릿 ID 매핑 ---
  const [beDeskTemplateId, setBeDeskTemplateId] = useState<number | null>(null);

  const getAuthToken = useCallback(async () => {
    return accessToken || await getAccessToken();
  }, [accessToken, getAccessToken]);

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

  const fetchCards = useCallback(async (cursor?: string | null) => {
    if (isCardLoading) return;
    setIsCardLoading(true);
    try {
      const token = await getAuthToken();
      const params: Record<string, string> = { limit: '30' };
      if (cursor) params.cursor = cursor;
      const { data: json } = await api.get('/api/v1/cards', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (json.success && json.data) {
        const newCards: CardListItem[] = json.data.cards;
        setCards(prev => cursor ? [...prev, ...newCards] : newCards);
        setNextCursor(json.data.nextCursor || null);
        setHasMore(json.data.hasMore);
      }
    } catch (err) {
      console.error("카드 목록 조회 실패:", err);
    } finally {
      setIsCardLoading(false);
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAuthToken]);

  useEffect(() => {
    fetchCards(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 등급순 → 같은 등급 내 총합 능력치 내림차순 정렬
  const sortedCards = useMemo(() => sortCardsByGradeAndStat(cards), [cards]);

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

  // --- Overflow 순차 단일 지원 시간 계산 ---
  const calculateOverflowTime = useCallback((): number | null => {
    if (!quest || requirements.length === 0 || selectedCardData.length === 0) return null;
    const baseTime = quest.durationMinutes;

    // 각 포지션의 잔여 작업량과 배정된 카드 추적
    interface PosState {
      type: string;
      remaining: number;
      cardIndices: number[];
      completed: boolean;
    }

    // 카드별 각 포지션 스탯 추출
    const getCardStatForType = (card: CardListItem, type: string): number => {
      const normalized = normalizeSkillType(type);
      let total = 0;
      if (normalizeSkillType(card.skill1.skillType) === normalized) total += card.skill1.value;
      if (normalizeSkillType(card.skill2.skillType) === normalized) total += card.skill2.value;
      if (normalizeSkillType(card.skill3.skillType) === normalized) total += card.skill3.value;
      return total;
    };

    // 그리디 배치: 각 카드를 가장 높은 스탯의 포지션에 배정
    const positions: PosState[] = requirements.map(r => ({
      type: r.type, remaining: r.value, cardIndices: [], completed: false,
    }));

    // 우선 각 포지션에 최소 1장 배정, 나머지는 가장 높은 스탯 매칭
    const assignedCards = new Set<number>();

    // 1차: 각 포지션에 가장 적합한 카드 1장씩 배정
    for (const pos of positions) {
      let bestIdx = -1;
      let bestStat = -1;
      for (let i = 0; i < selectedCardData.length; i++) {
        if (assignedCards.has(i)) continue;
        const stat = getCardStatForType(selectedCardData[i], pos.type);
        if (stat > bestStat) { bestStat = stat; bestIdx = i; }
      }
      if (bestIdx >= 0) {
        pos.cardIndices.push(bestIdx);
        assignedCards.add(bestIdx);
      }
    }

    // 2차: 남은 카드를 가장 부족한 포지션에 배정
    for (let i = 0; i < selectedCardData.length; i++) {
      if (assignedCards.has(i)) continue;
      let bestPosIdx = 0;
      let bestRatio = Infinity;
      for (let j = 0; j < positions.length; j++) {
        const currentStat = positions[j].cardIndices.reduce(
          (s, ci) => s + getCardStatForType(selectedCardData[ci], positions[j].type), 0
        );
        const ratio = currentStat / positions[j].remaining;
        if (ratio < bestRatio) { bestRatio = ratio; bestPosIdx = j; }
      }
      positions[bestPosIdx].cardIndices.push(i);
      assignedCards.add(i);
    }

    // Overflow 시뮬레이션
    let totalTime = 0;
    const MAX_ITERATIONS = 20;
    let iterations = 0;

    while (iterations++ < MAX_ITERATIONS) {
      const incomplete = positions.filter(p => !p.completed);
      if (incomplete.length === 0) break;

      // 각 미완료 포지션의 완료까지 걸리는 시간 계산
      let minTime = Infinity;
      let minPos: PosState | null = null;

      for (const pos of incomplete) {
        const rate = pos.cardIndices.reduce(
          (s, ci) => s + getCardStatForType(selectedCardData[ci], pos.type), 0
        );
        if (rate <= 0) return null; // 진행 불가
        const timeNeeded = (pos.remaining / rate) * baseTime;
        if (timeNeeded < minTime) { minTime = timeNeeded; minPos = pos; }
      }

      if (!minPos || minTime === Infinity) return null;

      // 시간 경과: 모든 미완료 포지션의 잔여 작업량 감소
      for (const pos of incomplete) {
        const rate = pos.cardIndices.reduce(
          (s, ci) => s + getCardStatForType(selectedCardData[ci], pos.type), 0
        );
        pos.remaining -= rate * (minTime / baseTime);
      }
      totalTime += minTime;
      minPos.completed = true;

      // 완료된 포지션의 카드를 가장 오래 걸리는 미완료 포지션에 지원
      const freedCards = minPos.cardIndices;
      const stillIncomplete = positions.filter(p => !p.completed);
      if (stillIncomplete.length > 0 && freedCards.length > 0) {
        let worstPos = stillIncomplete[0];
        let worstTime = 0;
        for (const pos of stillIncomplete) {
          const rate = pos.cardIndices.reduce(
            (s, ci) => s + getCardStatForType(selectedCardData[ci], pos.type), 0
          );
          const t = rate > 0 ? (pos.remaining / rate) * baseTime : Infinity;
          if (t > worstTime) { worstTime = t; worstPos = pos; }
        }
        worstPos.cardIndices.push(...freedCards);
      }
    }

    return Math.round(totalTime * 100) / 100;
  }, [quest, requirements, selectedCardData]);

  // --- 예상 시간 ---
  const estimatedTime = useMemo(() => calculateOverflowTime(), [calculateOverflowTime]);

  // --- 오버스펙 보상 계산 ---
  const rewardInfo = useMemo(() => {
    if (!quest || requirements.length === 0 || selectedCardData.length === 0) {
      return { ratio: 0, multiplier: 1, reward: quest?.rewardGold ?? 0 };
    }
    const totalCardStat = requirements.reduce((sum, req) => sum + getStatTotal(req.type), 0);
    const totalRequired = requirements.reduce((sum, req) => sum + req.value, 0);
    const r = totalRequired > 0 ? totalCardStat / totalRequired : 0;
    const rAdj = Math.max(1.0, r / 1.5);
    const multiplier = Math.pow(rAdj, -0.6);
    const reward = Math.round(quest.rewardGold * multiplier);
    return { ratio: r, multiplier, reward };
  }, [quest, requirements, selectedCardData, getStatTotal]);

  // --- 카드 선택 (cardSlotCount 제한) ---
  const handleCardClick = (id: number) => {
    if (usedCardIds.includes(id)) {
      onShowUsedCardModal();
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

    // 카드 수 검증 (최소 3장, 최대 cardSlotCount)
    const minCards = Math.min(3, quest.cardSlotCount);
    if (selectedCards.length < minCards) {
      setWarningMessage(`최소 ${minCards}장의 카드를 배치해야 합니다!`);
      return;
    }

    // 50% 최소 스탯 검증
    for (const req of requirements) {
      const total = getStatTotal(req.type);
      if (total < req.value * 0.5) {
        setWarningMessage(`${req.type} 스탯이 요구치의 50% 미만입니다! (${total} / ${Math.ceil(req.value * 0.5)} 필요)`);
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
      const durationMinutes = Math.min(estimatedTime ?? quest.durationMinutes, quest.durationMinutes);

      const now = new Date();
      const endAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

      const res = await api.post(`/api/v1/quests/${type}/${quest.questId}/start`, {
        deskId: targetDeskId,
        cardIds: selectedCards,
        startAt: now.toISOString().replace('Z', ''),
        endAt: endAt.toISOString().replace('Z', ''),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data?.success) {
        console.error("퀘스트 시작 응답:", res.data);
        throw new Error(res.data?.message || '퀘스트 시작 실패');
      }

      // FE 인덱스(0~4)로 store 업데이트, BE 템플릿 ID(1~5)와 혼용 방지
      const feDeskIndex = selectingDeskId ?? 0;
      startQuest(feDeskIndex, durationMinutes * 60, rewardInfo.reward, quest.title);
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
        const hardcapMinutes = quest.durationMinutes * 2;
        setHardcapMessage(`프로젝트에 진행할 인원들의 능력치가 생각보다 낮습니다. ${hardcapMinutes}분을 뛰어 넘어야 퀘스트 수주가 가능합니다!`);
      } else if (errCode === 'Q007') {
        setWarningMessage('프로젝트를 시작할 수 있는 부서가 없습니다.');
      } else {
        const msg = errData?.error?.message || errData?.error?.code || errData?.message || errData?.code || e.message || '알 수 없는 오류';
        setWarningMessage(`퀘스트 시작 실패: ${msg}`);
      }
    } finally {
      setIsStarting(false);
    }
  }, [quest, isStarting, selectedCards, requirements, getStatTotal, getAuthToken, estimatedTime, selectingDeskId, startQuest, rewardInfo.reward, router]);

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
  const swipe2StartRatioRef = useRef(0);
  const isSwipe2Ref = useRef(false);
  const swipe2MovedRef = useRef(false);

  // 실제 DOM 높이 기반으로 계산 (하드코딩 제거)
  const p2MaxScroll = Math.max(0, p2GridHeight - p2WrapperHeight);
  const p2ScrollOffset = p2ScrollRatio * p2MaxScroll;

  // 스크롤 하단 도달 시 다음 페이지 로드
  useEffect(() => {
    if (p2ScrollRatio > 0.9 && hasMore && !isCardLoading && nextCursor) {
      fetchCards(nextCursor);
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
  }, [cards]); // cards 로드/추가 시 재측정

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
      {/* ──── 좌측: 카드 목록 (card-list 레이아웃 통일) ──── */}
      <div className="phase2-left-col">
        <NineSliceBox src={`${ASSET_BASE}/assets/003-02/questInf_000.webp`} slice={[121, 248, 85, 248]} framePadding={24} borderScale={0.5} className="phase2-left-box">
          <div
            className="phase2-card-grid-wrapper"
            ref={p2WrapperRef}
            onWheel={handleP2Wheel}
            style={{ flex: 1, overflow: 'hidden' }}
            onPointerDown={(e) => {
              if (p2MaxScroll <= 0) return;
              // e.currentTarget.setPointerCapture(e.pointerId);
              isSwipe2Ref.current = true;
              swipe2MovedRef.current = false;
              swipe2StartYRef.current = e.clientY;
              swipe2StartRatioRef.current = p2ScrollRatio;
            }}
            onPointerMove={(e) => {
              if (!isSwipe2Ref.current || p2MaxScroll <= 0) return;
              const gameScale = parseFloat(document.documentElement.style.getPropertyValue('--game-scale')) || 1;
              const speedMultiplier = e.pointerType === 'touch' ? 5 : 1.5;
              const deltaY = (swipe2StartYRef.current - e.clientY) / gameScale * speedMultiplier;
              if (Math.abs(deltaY) > 5) swipe2MovedRef.current = true;
              setP2ScrollRatio(Math.min(1, Math.max(0, swipe2StartRatioRef.current + deltaY / p2MaxScroll)));
            }}
            onPointerUp={() => { isSwipe2Ref.current = false; swipe2MovedRef.current = false; }}
            onPointerCancel={() => { isSwipe2Ref.current = false; swipe2MovedRef.current = false; }}
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
                      <span className="phase2-card-stat stat-1">{displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                      <span className="phase2-card-stat stat-2">{displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                      <span className="phase2-card-stat stat-3">{displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
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
                const current = getStatTotal(req.type);
                const meetsMin = current >= req.value * 0.5;
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
              <div>예상 시간 : {estimatedTime != null ? `${estimatedTime}분` : `${quest.durationMinutes}분`}</div>
              <div>예상 보상 : {rewardInfo.reward.toLocaleString()}G</div>
              {rewardInfo.ratio > 1.5 && (
                <div style={{ fontSize: '20px', color: '#cc8800' }}>
                  (오버스펙 {Math.round(rewardInfo.multiplier * 100)}%)
                </div>
              )}
            </div>
          </NineSliceBox>
        </div>

        {/* 수락하기 / 취소하기 버튼 */}
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

          <NineSliceBox
            src={`${ASSET_BASE}/assets/003-01/questCard_000.webp`}
            slice={[200, 208, 200, 208]}
            framePadding={14}
            borderScale={0.4}
            className={`phase2-btn-accept ${selectedCards.length < Math.min(3, quest.cardSlotCount) ? 'disabled' : ''}`}
            onClick={handleAcceptQuest}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>
              {isStarting ? '시작 중...' : '수락하기'}
            </span>
          </NineSliceBox>
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
  const { accessToken, quests: storeQuests } = useGameStore();

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

  const [phase, setPhase] = useState<'select' | 'placement'>('select');
  const [mainQuest, setMainQuest] = useState<Quest | null>(null);
  const [subQuests, setSubQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showUsedCardModal, setShowUsedCardModal] = useState(false);
  const [showInProgressModal, setShowInProgressModal] = useState(false);

  // --- 인증 토큰 가져오기 ---
  const getAuthToken = useCallback(async () => {
    return accessToken || await getAccessToken();
  }, [accessToken, getAccessToken]);

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
        const current = sorted.find(d => d.status !== 'COMPLETED') ?? sorted[sorted.length - 1];

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
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchMainQuest(chapterNumber), fetchSubQuests()]);
      setIsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 퀘스트 수락 ---
  const handleAcceptQuest = useCallback(() => {
    if (!selectedQuest) return;
    // 이미 진행 중인 퀘스트면 모달 표시 (questId 또는 title 일치)
    if (activeQuestIds.has(selectedQuest.questId) || activeQuestTitles.has(selectedQuest.title)) {
      setShowInProgressModal(true);
      return;
    }
    setPhase('placement');
  }, [selectedQuest, activeQuestIds, activeQuestTitles]);

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
  const swipe1StartRatioRef = useRef(0);
  const isSwipe1Ref = useRef(false);
  const swipe1MovedRef = useRef(false);

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
    const trackPadding = 14;
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
      const trackPadding = 14;
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
      const trackPadding = 14;
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
                ref={subQuestWrapperRef}
                className="sub-quest-scroll-area"
                onPointerDown={(e) => {
                  if (maxScroll <= 0) return;
                  // e.currentTarget.setPointerCapture(e.pointerId);
                  isSwipe1Ref.current = true;
                  swipe1MovedRef.current = false;
                  swipe1StartYRef.current = e.clientY;
                  swipe1StartRatioRef.current = scrollRatio;
                }}
                onPointerMove={(e) => {
                  if (!isSwipe1Ref.current || maxScroll <= 0) return;
                  const gameScale = parseFloat(document.documentElement.style.getPropertyValue('--game-scale')) || 1;
                  const speedMultiplier = e.pointerType === 'touch' ? 2.5 : 1;
                  const deltaY = (swipe1StartYRef.current - e.clientY) / gameScale * speedMultiplier;
                  if (Math.abs(deltaY) > 5) swipe1MovedRef.current = true;
                  setScrollRatio(Math.min(1, Math.max(0, swipe1StartRatioRef.current + deltaY / maxScroll)));
                }}
                onPointerUp={() => { isSwipe1Ref.current = false; swipe1MovedRef.current = false; }}
                onPointerCancel={() => { isSwipe1Ref.current = false; swipe1MovedRef.current = false; }}
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
            onAccept={handleAcceptQuest}
          />
        </div>

        {/* === Phase 2: 카드 배치 화면 === */}
        <div className="quest-content phase-2-content" style={{ pointerEvents: phase === 'select' ? 'none' : 'auto' }}>
          <Phase2Content quest={selectedQuest} onCancel={() => setPhase('select')} onShowUsedCardModal={() => setShowUsedCardModal(true)} />
        </div>
      </div>

      {/* ──── 사용 중인 카드 모달 ──── */}
      {showUsedCardModal && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/50 font-dot pointer-events-auto">
          <div className="bg-[#FFFCE4] border-4 border-[#6b859e] p-8 text-center max-w-sm shadow-[4px_4px_0px_#4a5d73]">
            <p className="text-xl mb-6 font-bold text-slate-800">이미 퀘스트에서 사용 중인 카드입니다.</p>
            <button
              onClick={() => setShowUsedCardModal(false)}
              className="px-8 py-2 bg-[#ffcc00] text-black border-b-2 border-r-2 border-[#cc9900] active:border-0 active:translate-y-0.5 transition-all text-xl font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
}
