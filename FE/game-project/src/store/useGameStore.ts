import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type QuestStatus = 'IDLE' | 'IN_PROGRESS' | 'COMPLETED';

export interface InAppNotification {
  id: number;
  title: string;
  body: string;
  createdAt: number;
  isRead: boolean;
}

export interface DeskQuest {
  id: number;
  status: QuestStatus;
  isLocked: boolean;
  endTime: number | null;
  endAt: string | null;
  reward: number;
  title: string;
  questId: number | null;
  questType: 'main' | 'sub' | null;
  requiredLevel: number;
  unlockCostGold: number;
}

interface GameState {
  score: number;
  gold: number;
  coffee: number;
  nickname: string;
  walletAddress: string | null;
  gameStatus: 'IDLE' | 'NICKNAME_INPUT' | 'PLAYING';
  accessToken: string | null;
  unreadNotifications: number;
  quests: DeskQuest[];
  selectingDeskId: number | null;
  activeRewardModal: { isOpen: boolean; title: string; text: string } | null;
  activeUnlockConfirm: { isOpen: boolean; deskId: number } | null;
  comingSoonModal: { isOpen: boolean; text: string } | null;
  questInfoModal: { questTitle: string; rewardGold: number; remainMs: number; endAt: string | null } | null;
  questFetchTrigger: { questId: number; questType: 'main' | 'sub'; remainMs: number; endAt: string | null } | null;
  completeQuestTrigger: { deskId: number; questId: number; questType: 'MAIN' | 'SUB' } | null;
  isHUDModalOpen: boolean;
  sessionExpiredModal: boolean;
  notifications: InAppNotification[];
  bugsEnabled: boolean;
  tutorialActive: boolean;
  tutorialQuestStep: number | null;  // null=비활성, 1~6=현재 튜토리얼 퀘스트 단계
  tutorialQuestScriptVisible: boolean;
  tutorialGachaCount: number;
  tutorialCards: import('@/lib/tutorialData').TutorialCard[];
  tutorialEnhanceCount: number;
  tutorialScriptId: string | null;    // current script group to show
  tutorialAccessPage: string | null;  // which page nav is accessible
  tutorialQuestTimerActive: boolean;
  tutorialQuestTimerSec: number;
  tutorialQuestTimerReward: number;
  setAuth: (token: string | null) => void;
  increaseScore: (by: number) => void;
  increaseGold: (by: number) => void;
  increaseCoffee: (by: number) => void;
  resetScore: () => void;
  setWallet: (address: string) => void;
  setNickname: (name: string) => void;
  setGameStatus: (status: 'IDLE' | 'NICKNAME_INPUT' | 'PLAYING') => void;
  startGame: () => void;
  logout: () => void;
  setSelectingDeskId: (id: number | null) => void;
  startQuest: (id: number, durationSeconds: number, reward: number, title?: string, questId?: number | null, questType?: 'main' | 'sub' | null) => void;
  finishQuestTimer: (id: number) => void;
  completeQuest: (id: number) => void;
  completeQuestNoGold: (id: number) => void;
  completeQuestSilent: (id: number) => void;
  unlockQuestSlot: (id: number) => void;
  setUnlockConfirm: (id: number | null) => void;
  closeRewardModal: () => void;
  setDesksFromApi: (desks: Array<{ deskTemplateId: number; unlocked: boolean; requiredLevel?: number; unlockCostGold?: number }>) => void;
  openComingSoonModal: (text?: string) => void;
  closeComingSoonModal: () => void;
  setResources: (gold: number, coffee: number) => void;
  setHUDModalOpen: (open: boolean) => void;
  setQuestInfoModal: (data: { questTitle: string; rewardGold: number; remainMs: number; endAt: string | null } | null) => void;
  setQuestFetchTrigger: (data: { questId: number; questType: 'main' | 'sub'; remainMs: number; endAt: string | null } | null) => void;
  setCompleteQuestTrigger: (data: { deskId: number; questId: number; questType: 'MAIN' | 'SUB' } | null) => void;
  syncActiveQuests: (activeDesks: Array<{ deskId: number; questId: number; questType: 'main' | 'sub'; title: string; rewardGold: number; endAt: string; status?: string; baseDurationSeconds?: number }>) => void;
  finishQuestByQuestId: (questId: number) => void;
  setSessionExpiredModal: (v: boolean) => void;
  toggleBugs: () => void;
  setTutorialActive: (v: boolean) => void;
  setTutorialQuestStep: (step: number | null) => void;
  setTutorialQuestScriptVisible: (v: boolean) => void;
  setTutorialGachaCount: (count: number) => void;
  setTutorialScriptId: (id: string | null) => void;
  setTutorialAccessPage: (page: string | null) => void;
  addTutorialCard: (card: import('@/lib/tutorialData').TutorialCard) => void;
  enhanceTutorialCard: (cardId: number) => void;
  addSynthesisCard: (card: import('@/lib/tutorialData').TutorialCard) => void;
  removeTutorialCards: (cardIds: number[]) => void;
  startTutorialQuestTimer: (sec: number, reward: number) => void;
  stopTutorialQuestTimer: () => void;
  resetTutorialState: () => void;
  showTutorialGoldModal: boolean;
  setShowTutorialGoldModal: (v: boolean) => void;
  pushNotification: (title: string, body: string) => void;
  markNotificationRead: (id: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
  score: 0,
  gold: 100000,
  coffee: 0,
  nickname: '',
  walletAddress: null,
  gameStatus: 'IDLE',
  accessToken: null,
  unreadNotifications: 1,
  quests: [
    { id: 0, status: 'IDLE', isLocked: false, endTime: null, endAt: null, reward: 100, title: '', questId: null, questType: null, requiredLevel: 0, unlockCostGold: 50000 },
    { id: 1, status: 'IDLE', isLocked: true,  endTime: null, endAt: null, reward: 200, title: '', questId: null, questType: null, requiredLevel: 2, unlockCostGold: 50000 },
    { id: 2, status: 'IDLE', isLocked: true,  endTime: null, endAt: null, reward: 300, title: '', questId: null, questType: null, requiredLevel: 3, unlockCostGold: 50000 },
    { id: 3, status: 'IDLE', isLocked: true,  endTime: null, endAt: null, reward: 400, title: '', questId: null, questType: null, requiredLevel: 4, unlockCostGold: 50000 },
    { id: 4, status: 'IDLE', isLocked: true,  endTime: null, endAt: null, reward: 500, title: '', questId: null, questType: null, requiredLevel: 5, unlockCostGold: 50000 },
  ],
  selectingDeskId: null,
  activeRewardModal: null,
  activeUnlockConfirm: null,
  comingSoonModal: null,
  questInfoModal: null,
  questFetchTrigger: null,
  completeQuestTrigger: null,
  isHUDModalOpen: false,
  sessionExpiredModal: false,
  notifications: [],
  bugsEnabled: true,
  tutorialActive: false,
  tutorialQuestStep: null,
  tutorialQuestScriptVisible: false,
  tutorialGachaCount: 0,
  tutorialCards: [],
  tutorialEnhanceCount: 0,
  tutorialScriptId: null,
  tutorialAccessPage: null,
  tutorialQuestTimerActive: false,
  tutorialQuestTimerSec: 0,
  tutorialQuestTimerReward: 0,

  setAuth: (token) => set({ accessToken: token }),
  increaseScore: (by) => set((state) => ({ score: state.score + by })),
  increaseGold: (by) => set((state) => ({ gold: state.gold + by })),
  increaseCoffee: (by) => set((state) => ({ coffee: state.coffee + by })),
  resetScore: () => set({ score: 0 }),
  setWallet: (address) => set({ walletAddress: address }),
  setNickname: (name) => set({ nickname: name }),
  setGameStatus: (status) => set({ gameStatus: status }),
  startGame: () => set({ gameStatus: 'PLAYING' }),
  logout: () => set({
    gameStatus: 'IDLE',
    nickname: '',
    accessToken: null,
    walletAddress: null
  }),
  setSelectingDeskId: (id) => set({ selectingDeskId: id }),
  startQuest: (id, durationSeconds, reward, title = '', questId = null, questType = null) => set((state) => {
    const updated = state.quests.map(q =>
      q.id === id ? {
        ...q,
        status: 'IN_PROGRESS' as QuestStatus,
        endTime: Date.now() + (durationSeconds * 1000),
        endAt: null,
        reward,
        title,
        questId,
        questType,
      } : q
    );
    return { quests: updated, selectingDeskId: null };
  }),
  finishQuestTimer: (id) => set((state) => {
    const updated = state.quests.map(q =>
      q.id === id && q.status === 'IN_PROGRESS' ? { ...q, status: 'COMPLETED' as QuestStatus } : q
    );
    return { quests: updated };
  }),
  completeQuest: (id) => set((state) => {
    let rewardAcc = 0;
    const updated = state.quests.map(q => {
      if (q.id === id) {
        rewardAcc = q.reward;
        return { ...q, status: 'IDLE' as QuestStatus, endTime: null, endAt: null, title: '' };
      }
      return q;
    });
    return {
      quests: updated,
      gold: state.gold + rewardAcc,
      activeRewardModal: { isOpen: true, title: "퀘스트 완료", text: `${rewardAcc.toLocaleString()} 골드를 획득하였습니다.` }
    };
  }),
  completeQuestSilent: (id) => set((state) => ({
    quests: state.quests.map(q =>
      q.id === id ? { ...q, status: 'IDLE' as QuestStatus, endTime: null, endAt: null, title: '', questId: null, questType: null } : q
    ),
  })),
  // 골드는 BE에서 받아서 setResources로 갱신 — 로컬 gold 증가 없이 상태만 IDLE로
  completeQuestNoGold: (id) => set((state) => {
    const quest = state.quests.find(q => q.id === id);
    const rewardAcc = quest?.reward ?? 0;
    const updated = state.quests.map(q =>
      q.id === id ? { ...q, status: 'IDLE' as QuestStatus, endTime: null, endAt: null, title: '' } : q
    );
    return {
      quests: updated,
      activeRewardModal: { isOpen: true, title: "퀘스트 완료", text: `${rewardAcc.toLocaleString()} 골드를 획득하였습니다.` }
    };
  }),
  unlockQuestSlot: (id) => set((state) => {
    const quest = state.quests.find(q => q.id === id);
    const cost = quest?.unlockCostGold ?? 50000;
    if (state.gold < cost) return state;
    const updated = state.quests.map(q =>
      q.id === id ? { ...q, isLocked: false } : q
    );
    return { gold: state.gold - cost, quests: updated, activeUnlockConfirm: null };
  }),
  setUnlockConfirm: (id) => set({
    activeUnlockConfirm: id !== null ? { isOpen: true, deskId: id } : null
  }),
  closeRewardModal: () => set({ activeRewardModal: null }),
  openComingSoonModal: (text) => set({
    comingSoonModal: { isOpen: true, text: text || "이후 릴리즈에서 공개될 예정입니다." }
  }),
  closeComingSoonModal: () => set({ comingSoonModal: null }),
  setResources: (gold, coffee) => set({ gold, coffee }),
  setHUDModalOpen: (open) => set({ isHUDModalOpen: open }),
  setQuestInfoModal: (data) => set({ questInfoModal: data }),
  setQuestFetchTrigger: (data) => set({ questFetchTrigger: data }),
  setCompleteQuestTrigger: (data) => set({ completeQuestTrigger: data }),
  setSessionExpiredModal: (v) => set({ sessionExpiredModal: v }),
  toggleBugs: () => set((state) => ({ bugsEnabled: !state.bugsEnabled })),
  setTutorialActive: (v) => set({ tutorialActive: v }),
  setTutorialQuestStep: (step) => set({
    tutorialQuestStep: step,
    bugsEnabled: step !== null ? false : true,
  }),
  setTutorialQuestScriptVisible: (v) => set({ tutorialQuestScriptVisible: v }),
  setTutorialGachaCount: (count) => set({ tutorialGachaCount: count }),
  setTutorialScriptId: (id) => set({ tutorialScriptId: id, tutorialQuestScriptVisible: id !== null }),
  setTutorialAccessPage: (page) => set({ tutorialAccessPage: page }),
  addTutorialCard: (card) => set((state) => ({ tutorialCards: [...state.tutorialCards, card] })),
  enhanceTutorialCard: (cardId) => set((state) => ({
    tutorialCards: state.tutorialCards.map(c =>
      c.cardId === cardId ? {
        ...c,
        skill1: { ...c.skill1, value: c.skill1.value + 10 },
        skill2: { ...c.skill2, value: c.skill2.value + 10 },
        skill3: { ...c.skill3, value: c.skill3.value + 10 },
        enhanceTryCount: c.enhanceTryCount + 1,
        enhanceSuccessCount: c.enhanceSuccessCount + 1,
      } : c
    ),
    tutorialEnhanceCount: state.tutorialEnhanceCount + 1,
  })),
  addSynthesisCard: (card) => set((state) => ({ tutorialCards: [...state.tutorialCards, card] })),
  removeTutorialCards: (cardIds) => set((state) => ({
    tutorialCards: state.tutorialCards.filter(c => !cardIds.includes(c.cardId)),
  })),
  startTutorialQuestTimer: (sec, reward) => set({ tutorialQuestTimerActive: true, tutorialQuestTimerSec: sec, tutorialQuestTimerReward: reward }),
  stopTutorialQuestTimer: () => set({ tutorialQuestTimerActive: false, tutorialQuestTimerSec: 0, tutorialQuestTimerReward: 0 }),
  showTutorialGoldModal: false,
  setShowTutorialGoldModal: (v) => set({ showTutorialGoldModal: v }),
  resetTutorialState: () => set({
    tutorialActive: false,
    tutorialQuestStep: null,
    tutorialQuestScriptVisible: false,
    tutorialGachaCount: 0,
    tutorialCards: [],
    tutorialEnhanceCount: 0,
    tutorialScriptId: null,
    tutorialAccessPage: null,
    tutorialQuestTimerActive: false,
    tutorialQuestTimerSec: 0,
    tutorialQuestTimerReward: 0,
    bugsEnabled: true,
  }),
  pushNotification: (title, body) => set((state) => ({
    notifications: [
      { id: Date.now(), title, body, createdAt: Date.now(), isRead: false },
      ...state.notifications,
    ].slice(0, 50), // 최대 50개 유지
    unreadNotifications: state.unreadNotifications + 1,
  })),
  markNotificationRead: (id) => set((state) => {
    const target = state.notifications.find(n => n.id === id);
    if (!target || target.isRead) return state;
    return {
      notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
      unreadNotifications: Math.max(0, state.unreadNotifications - 1),
    };
  }),
  setDesksFromApi: (desks) => set((state) => {
    const updated = state.quests.map(q => {
      const desk = desks.find(d => d.deskTemplateId === q.id + 1);
      if (desk) return {
        ...q,
        isLocked: !desk.unlocked,
        requiredLevel: desk.requiredLevel ?? q.requiredLevel,
        unlockCostGold: desk.unlockCostGold ?? q.unlockCostGold,
      };
      return q;
    });
    return { quests: updated };
  }),
  finishQuestByQuestId: (questId) => set((state) => {
    const updated = state.quests.map(q =>
      q.questId === questId && q.status === 'IN_PROGRESS'
        ? { ...q, status: 'COMPLETED' as QuestStatus }
        : q
    );
    return { quests: updated };
  }),
  // BE deskId(1-5) → store quest id(0-4)로 매핑해 IN_PROGRESS/COMPLETED 동기화
  syncActiveQuests: (activeDesks) => set((state) => {
    // BE가 timezone 없이 반환하는 날짜 문자열을 UTC ISO로 정규화
    // "2026-03-19 15:23:49.837" → "2026-03-19T15:23:49.837Z"
    const toUtcIso = (s: string) =>
      s.includes('Z') || s.includes('+') ? s : s.replace(' ', 'T') + 'Z';

    const updated = state.quests.map(q => {
      const active = activeDesks.find(d => d.deskId === q.id + 1);
      if (active) {
        const endTime = active.baseDurationSeconds != null
          ? Date.now() + active.baseDurationSeconds * 1000
          : active.endAt ? new Date(toUtcIso(active.endAt)).getTime() : (q.endTime ?? Date.now() + 60 * 60 * 1000);
        const endAt = new Date(endTime).toISOString();
        const apiStatus = active.status?.toUpperCase();
        const newStatus: QuestStatus = apiStatus === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';
        return {
          ...q,
          status: newStatus,
          title: active.title,
          reward: active.rewardGold,
          questId: active.questId,
          questType: active.questType,
          endAt,
          endTime,
        };
      }
      // BE 활성 목록에 없는데 IN_PROGRESS/COMPLETED 상태면 IDLE로 초기화 (stale 데이터 제거)
      if (!active && (q.status === 'IN_PROGRESS' || q.status === 'COMPLETED')) {
        return { ...q, status: 'IDLE' as QuestStatus, endTime: null, endAt: null, title: '', questId: null, questType: null };
      }
      return q;
    });
    return { quests: updated };
  }),
  }),
  {
    name: 'game-storage',
    partialize: (state) => ({
      quests: state.quests.map(q => ({
        id: q.id,
        status: q.status,
        isLocked: q.isLocked,
        endTime: q.endTime,
        endAt: q.endAt,
        reward: q.reward,
        title: q.title,
        questId: q.questId,
        questType: q.questType,
        requiredLevel: q.requiredLevel,
      })),
      tutorialActive: state.tutorialActive,
      tutorialQuestStep: state.tutorialQuestStep,
      tutorialGachaCount: state.tutorialGachaCount,
      tutorialCards: state.tutorialCards,
      tutorialEnhanceCount: state.tutorialEnhanceCount,
      tutorialScriptId: state.tutorialScriptId,
      tutorialAccessPage: state.tutorialAccessPage,
      tutorialQuestScriptVisible: state.tutorialQuestScriptVisible,
    }),
  }
));
