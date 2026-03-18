"use client";

import { useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useGameStore } from "@/store/useGameStore";
import "./gacha.css";

// --- NineSliceBox Component ---
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
          top: 0, left: 0, right: 0, bottom: 0,
          borderStyle: 'solid',
          borderWidth: `${t}px ${r}px ${b}px ${l}px`,
          borderImageSource: `url(${src})`,
          borderImageSlice: `${slice[0]} ${slice[1]} ${slice[2]} ${slice[3]} fill`,
          borderImageRepeat: 'stretch',
          imageRendering: 'pixelated',
          transform: 'translateZ(0) scale(1.0001)',
          backfaceVisibility: 'hidden',
          clipPath: 'inset(0)',
          zIndex: 0,
          pointerEvents: 'none'
        } as React.CSSProperties}
      />
      <div className="nineslice-content" style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// --- Types ---
type TabType = 'flyer' | 'fair' | 'public';
type PhaseType = 'select' | 'result_1' | 'result_10';

const TAB_TO_TYPE_ID: Record<TabType, string> = {
  flyer: 'FLYER',
  fair: 'EXPO',
  public: 'OPEN_RECRUIT',
};

const GACHA_COSTS: Record<TabType, { single: number; ten: number }> = {
  flyer: { single: 10000, ten: 90000 },
  fair: { single: 15000, ten: 135000 },
  public: { single: 40000, ten: 360000 },
};

interface CardSkill {
  skillType: string;
  value: number;
}

interface GachaCardResult {
  cardId: number;
  grade: string;
  name: string;
  imageUrl: string;
  skill1: CardSkill;
  skill2: CardSkill;
  skill3: CardSkill;
  specialAbility: { name: string; description: string; effects: string } | null;
}

function displaySkillType(type: string): string {
  return type.toUpperCase() === 'DEVOPS' ? 'DEV' : type;
}

export default function GachaPage() {
  const [currentTab, setCurrentTab] = useState<TabType>('flyer');
  const [phase, setPhase] = useState<PhaseType>('select');
  const { gold, increaseGold, openComingSoonModal, accessToken } = useGameStore();
  const { getAccessToken } = usePrivy();
  const [drawnCards, setDrawnCards] = useState<GachaCardResult[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isPulling, setIsPulling] = useState(false);

  const canPull1 = gold >= GACHA_COSTS[currentTab].single;
  const canPull10 = gold >= GACHA_COSTS[currentTab].ten;

  const getAuthToken = useCallback(async () => {
    return accessToken || await getAccessToken();
  }, [accessToken, getAccessToken]);

  // --- DEV: Mock 데이터로 결과 미리보기 (골드 차감 없음) ---
  const USE_MOCK = true; // TODO: 실제 배포 시 false로 변경
  const MOCK_CARDS: GachaCardResult[] = [
    { cardId: 1, grade: 'S', name: '천재 개발자 김사장', imageUrl: '/assets/006/SCardImage_000.png', skill1: { skillType: 'BE', value: 95 }, skill2: { skillType: 'FE', value: 88 }, skill3: { skillType: 'AI', value: 92 }, specialAbility: { name: '풀스택 마스터', description: '모든 능력치 +10%', effects: '' } },
    { cardId: 2, grade: 'A', name: '분위기 메이커 박과장', imageUrl: '/assets/006/SCardImage_001.png', skill1: { skillType: 'DBA', value: 78 }, skill2: { skillType: 'BE', value: 65 }, skill3: { skillType: 'DEV', value: 60 }, specialAbility: null },
    { cardId: 3, grade: 'B', name: '야근킹 이대리', imageUrl: '/assets/006/SCardImage_002.png', skill1: { skillType: 'FE', value: 55 }, skill2: { skillType: 'DESIGN', value: 50 }, skill3: { skillType: 'BE', value: 48 }, specialAbility: null },
    { cardId: 4, grade: 'A', name: '갓생사는 최대리', imageUrl: '/assets/006/SCardImage_003.png', skill1: { skillType: 'DESIGN', value: 72 }, skill2: { skillType: 'FE', value: 70 }, skill3: { skillType: 'AI', value: 61 }, specialAbility: null },
    { cardId: 5, grade: 'C', name: '점심러 한사원', imageUrl: '/assets/006/SCardImage_004.png', skill1: { skillType: 'BE', value: 35 }, skill2: { skillType: 'DBA', value: 30 }, skill3: { skillType: 'DEV', value: 28 }, specialAbility: null },
    { cardId: 6, grade: 'D', name: '신입 오인턴', imageUrl: '/assets/006/SCardImage_005.png', skill1: { skillType: 'FE', value: 20 }, skill2: { skillType: 'BE', value: 18 }, skill3: { skillType: 'AI', value: 15 }, specialAbility: null },
    { cardId: 7, grade: 'B', name: '커피중독 정과장', imageUrl: '/assets/006/SCardImage_006.png', skill1: { skillType: 'AI', value: 58 }, skill2: { skillType: 'DBA', value: 52 }, skill3: { skillType: 'DESIGN', value: 45 }, specialAbility: null },
    { cardId: 8, grade: 'A', name: '알고리즘 왕 유팀장', imageUrl: '/assets/006/SCardImage_007.png', skill1: { skillType: 'BE', value: 80 }, skill2: { skillType: 'AI', value: 75 }, skill3: { skillType: 'FE', value: 68 }, specialAbility: null },
    { cardId: 9, grade: 'C', name: '디자인감각 송대리', imageUrl: '/assets/006/SCardImage_008.png', skill1: { skillType: 'DESIGN', value: 42 }, skill2: { skillType: 'FE', value: 38 }, skill3: { skillType: 'DEV', value: 33 }, specialAbility: null },
    { cardId: 10, grade: 'S', name: '전설의 CTO 나부장', imageUrl: '/assets/006/SCardImage_009.png', skill1: { skillType: 'BE', value: 98 }, skill2: { skillType: 'AI', value: 95 }, skill3: { skillType: 'DBA', value: 90 }, specialAbility: { name: '기술 리더십', description: '팀 전체 능력치 +15%', effects: '' } },
  ];

  // API 뽑기
  const handlePull = async (count: 1 | 10) => {
    if (isPulling) return;

    // Mock 모드: API 호출 없이 바로 결과 표시
    if (USE_MOCK) {
      setIsPulling(true);
      await new Promise(r => setTimeout(r, 300)); // 살짝 딜레이
      if (count === 1) {
        setDrawnCards([MOCK_CARDS[Math.floor(Math.random() * MOCK_CARDS.length)]]);
      } else {
        const picked = Array.from({ length: 10 }, () => MOCK_CARDS[Math.floor(Math.random() * MOCK_CARDS.length)]);
        setDrawnCards(picked);
      }
      setSelectedCardIndex(null);
      setPhase(count === 1 ? 'result_1' : 'result_10');
      setIsPulling(false);
      return;
    }

    const cost = count === 1 ? GACHA_COSTS[currentTab].single : GACHA_COSTS[currentTab].ten;
    if (gold < cost) return;
    setIsPulling(true);
    try {
      const token = await getAuthToken();
      const typeId = TAB_TO_TYPE_ID[currentTab];
      const body = { type: typeId, count };
      console.log("가챠 요청:", body);
      const res = await fetch('/api/v1/gacha/draws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const msg = errorBody?.error?.message || errorBody?.message || `오류 (${res.status})`;
        console.error("가챠 실패:", res.status, msg);
        alert(msg);
        setIsPulling(false);
        return;
      }
      const resData = await res.json();
      const drawData = resData.data ?? resData;
      if (drawData?.cards) {
        // BE 응답의 skill 필드가 { type, value } 형식 → { skillType, value }로 정규화
        const normalizedCards: GachaCardResult[] = drawData.cards.map((c: Record<string, unknown>) => {
          const s1 = c.skill1 as Record<string, unknown>;
          const s2 = c.skill2 as Record<string, unknown>;
          const s3 = c.skill3 as Record<string, unknown>;
          return {
            ...c,
            skill1: { skillType: (s1?.skillType || s1?.type) as string, value: s1?.value as number },
            skill2: { skillType: (s2?.skillType || s2?.type) as string, value: s2?.value as number },
            skill3: { skillType: (s3?.skillType || s3?.type) as string, value: s3?.value as number },
          };
        });
        // BE가 차감 후 잔액을 알려주면 그걸 사용, 아니면 FE에서 차감
        if (drawData.remainingGold != null) {
          const diff = gold - (drawData.remainingGold as number);
          if (diff > 0) increaseGold(-diff);
        } else {
          increaseGold(-cost);
        }
        setDrawnCards(normalizedCards);
        setSelectedCardIndex(null);
        setPhase(count === 1 ? 'result_1' : 'result_10');
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: unknown }; message?: string; config?: { url?: string; data?: string } };
      console.error("가챠 실패 status:", e.response?.status);
      console.error("가챠 실패 data:", JSON.stringify(e.response?.data));
      console.error("가챠 실패 url:", e.config?.url);
      console.error("가챠 실패 body:", e.config?.data);
      console.error("가챠 실패 message:", e.message);
      const errData = e.response?.data as Record<string, unknown> | undefined;
      alert((errData?.message as string) || (errData?.error as string) || e.message || '뽑기에 실패했습니다.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleReturn = () => {
    setDrawnCards([]);
    setSelectedCardIndex(null);
    setPhase('select');
  };

  const selectedCard = selectedCardIndex != null ? drawnCards[selectedCardIndex] : null;

  // 뽑기 버튼 컴포넌트
  const PullButtons = () => (
    <>
      <div
        className={`gacha-action-btn${!canPull1 || isPulling ? ' btn-disabled' : ''}`}
        style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
        onClick={canPull1 && !isPulling ? () => handlePull(1) : undefined}
      >
        <span>1회 뽑기</span>
        <span className="btn-subtitle">({GACHA_COSTS[currentTab].single.toLocaleString()}G)</span>
      </div>
      <div
        className={`gacha-action-btn btn-10pull${!canPull10 || isPulling ? ' btn-disabled' : ''}`}
        style={{ backgroundImage: 'url(/assets/006/gachaButton_000.png)' }}
        onClick={canPull10 && !isPulling ? () => handlePull(10) : undefined}
      >
        <span>10회 뽑기</span>
        <span className="btn-subtitle">({GACHA_COSTS[currentTab].ten.toLocaleString()}G)</span>
      </div>
    </>
  );

  return (
    <div className="gacha-page-container">
      <div className={`gacha-content gacha-bg-${currentTab}`}>

        {/* 좌측 상단 골드 HUD */}
        <div className="gacha-gold-hud">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '4.7cqw', width: '17.5cqw' }}>
            <div
              style={{
                position: 'absolute',
                right: 0, top: 0, bottom: 0,
                left: '2.5cqw',
                paddingRight: '1.9cqw',
                fontSize: '1.7cqw',
                backgroundImage: "url('/assets/002/upperBlank_002.png')",
                backgroundSize: '100% 100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                fontFamily: "'StardustS', 'Stardust', sans-serif",
                fontWeight: 'bold',
                color: '#000',
              }}
            >
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{gold.toLocaleString()}</span>
              <span style={{ marginLeft: '0.4cqw', fontSize: '1.4cqw' }}>G</span>
            </div>
            <img
              src="/assets/002/coin_002.png"
              alt="gold"
              style={{
                position: 'absolute',
                zIndex: 10,
                left: '-1.9cqw',
                top: '0.3cqw',
                width: '5cqw',
                height: '5cqw',
                imageRendering: 'pixelated',
              }}
            />
          </div>
        </div>

        {/* 상단 3개 탭 */}
        <div className="gacha-tabs-container">
          <div className="gacha-tab-wrapper">
            <div
              className={`gacha-tab ${currentTab === 'flyer' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('flyer'); handleReturn(); }}
            >
              <div className="gacha-tab-inner" />
              <span>전단지 뽑기</span>
            </div>
          </div>
          <div className="gacha-tab-wrapper">
            <div
              className={`gacha-tab ${currentTab === 'fair' ? 'active' : ''} brightness-75`}
              onClick={() => { openComingSoonModal(); }}
            >
              <div className="gacha-tab-inner" />
              <span>박람회 뽑기</span>
            </div>
          </div>
          <div className="gacha-tab-wrapper">
            <div
              className={`gacha-tab ${currentTab === 'public' ? 'active' : ''} brightness-75`}
              onClick={() => { openComingSoonModal(); }}
            >
              <div className="gacha-tab-inner" />
              <span>공채 뽑기</span>
            </div>
          </div>
        </div>

        {/* 초기 화면 - 뽑기 버튼 */}
        <div className="gacha-main-area">
          {phase === 'select' && (
            <div className="gacha-bottom-area">
              <PullButtons />
            </div>
          )}
        </div>

        {/* --- 1회 뽑기 결과 --- */}
        {phase === 'result_1' && drawnCards.length > 0 && (
          <div className="gacha-result-container" onClick={handleReturn}>
            <div className="gacha-result-layout" onClick={(e) => e.stopPropagation()}>
              {/* 카드 이미지 */}
              <div className="gacha-result-card-col">
                <div className="gacha-result-single-card" data-grade={drawnCards[0].grade}>
                  <img src={drawnCards[0].imageUrl} alt={drawnCards[0].name} draggable={false} />
                  <span className="gacha-card-stat stat-1">{displaySkillType(drawnCards[0].skill1.skillType)} {drawnCards[0].skill1.value}</span>
                  <span className="gacha-card-stat stat-2">{displaySkillType(drawnCards[0].skill2.skillType)} {drawnCards[0].skill2.value}</span>
                  <span className="gacha-card-stat stat-3">{displaySkillType(drawnCards[0].skill3.skillType)} {drawnCards[0].skill3.value}</span>
                </div>
              </div>
              {/* 카드 정보 */}
              <div className="gacha-result-info-col">
                <NineSliceBox src="/assets/006/gachaInf_000.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="gacha-result-info-box">
                  <div className="gacha-result-name">{drawnCards[0].name}</div>
                  <div className="gacha-result-grade">등급: {drawnCards[0].grade}</div>
                  <div className="gacha-result-stats">
                    <div>{displaySkillType(drawnCards[0].skill1.skillType)}: {drawnCards[0].skill1.value}</div>
                    <div>{displaySkillType(drawnCards[0].skill2.skillType)}: {drawnCards[0].skill2.value}</div>
                    <div>{displaySkillType(drawnCards[0].skill3.skillType)}: {drawnCards[0].skill3.value}</div>
                  </div>
                  {drawnCards[0].specialAbility && (
                    <div className="gacha-result-special">특수 능력: {typeof drawnCards[0].specialAbility === 'string' ? drawnCards[0].specialAbility : drawnCards[0].specialAbility.name}</div>
                  )}
                </NineSliceBox>
              </div>
            </div>

            <div className="gacha-bottom-buttons" onClick={(e) => e.stopPropagation()}>
              <PullButtons />
            </div>
          </div>
        )}

        {/* --- 10회 뽑기 결과 --- */}
        {phase === 'result_10' && drawnCards.length > 0 && (
          <div className="gacha-result-container" onClick={handleReturn}>
            <div className="gacha-result-layout gacha-result-10" onClick={(e) => e.stopPropagation()}>
              {/* 좌측: 카드 그리드 */}
              <div className="gacha-result-grid-col">
                <div className="gacha-result-grid">
                  {drawnCards.map((card, idx) => (
                    <div
                      key={idx}
                      className={`gacha-grid-card ${selectedCardIndex === idx ? 'selected' : ''}`}
                      data-grade={card.grade}
                      onClick={() => setSelectedCardIndex(idx)}
                    >
                      <img src={card.imageUrl} alt={card.name} draggable={false} />
                      <span className="gacha-card-stat stat-1">{displaySkillType(card.skill1.skillType)} {card.skill1.value}</span>
                      <span className="gacha-card-stat stat-2">{displaySkillType(card.skill2.skillType)} {card.skill2.value}</span>
                      <span className="gacha-card-stat stat-3">{displaySkillType(card.skill3.skillType)} {card.skill3.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* 우측: 선택된 카드 상세 */}
              <div className="gacha-result-detail-col">
                {selectedCard ? (
                  <div className="gacha-result-detail">
                    <div className="gacha-detail-big-card" data-grade={selectedCard.grade}>
                      <img src={selectedCard.imageUrl} alt={selectedCard.name} draggable={false} />
                      <span className="gacha-card-stat stat-1">{displaySkillType(selectedCard.skill1.skillType)} {selectedCard.skill1.value}</span>
                      <span className="gacha-card-stat stat-2">{displaySkillType(selectedCard.skill2.skillType)} {selectedCard.skill2.value}</span>
                      <span className="gacha-card-stat stat-3">{displaySkillType(selectedCard.skill3.skillType)} {selectedCard.skill3.value}</span>
                    </div>
                    <NineSliceBox src="/assets/006/gachaInf_000.png" slice={[108, 260, 129, 340]} framePadding={14} borderScale={0.35} className="gacha-detail-info-box">
                      <div className="gacha-result-name">{selectedCard.name}</div>
                      <div className="gacha-result-grade">등급: {selectedCard.grade}</div>
                      {selectedCard.specialAbility && (
                        <div className="gacha-result-special">특수 능력: {typeof selectedCard.specialAbility === 'string' ? selectedCard.specialAbility : selectedCard.specialAbility.name}</div>
                      )}
                    </NineSliceBox>
                  </div>
                ) : (
                  <div className="gacha-detail-empty">카드를 선택하세요</div>
                )}
              </div>
            </div>

            <div className="gacha-bottom-buttons" onClick={(e) => e.stopPropagation()}>
              <PullButtons />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
