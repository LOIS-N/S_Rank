import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type QuestStatus = 'IDLE' | 'IN_PROGRESS' | 'COMPLETED';

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
  unlockQuestSlot: (id: number) => void;
  setUnlockConfirm: (id: number | null) => void;
  closeRewardModal: () => void;
  setDesksFromApi: (desks: Array<{ deskTemplateId: number; unlocked: boolean }>) => void;
  openComingSoonModal: (text?: string) => void;
  closeComingSoonModal: () => void;
  setResources: (gold: number, coffee: number) => void;
  setHUDModalOpen: (open: boolean) => void;
  setQuestInfoModal: (data: { questTitle: string; rewardGold: number; remainMs: number; endAt: string | null } | null) => void;
  setQuestFetchTrigger: (data: { questId: number; questType: 'main' | 'sub'; remainMs: number; endAt: string | null } | null) => void;
  setCompleteQuestTrigger: (data: { deskId: number; questId: number; questType: 'MAIN' | 'SUB' } | null) => void;
  syncActiveQuests: (activeDesks: Array<{ deskId: number; questId: number; questType: 'main' | 'sub'; title: string; rewardGold: number; endAt: string }>) => void;
  setSessionExpiredModal: (v: boolean) => void;
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
    { id: 0, status: 'IDLE', isLocked: false, endTime: null, endAt: null, reward: 100, title: '', questId: null, questType: null },
    { id: 1, status: 'IDLE', isLocked: true,  endTime: null, endAt: null, reward: 200, title: '', questId: null, questType: null },
    { id: 2, status: 'IDLE', isLocked: true,  endTime: null, endAt: null, reward: 300, title: '', questId: null, questType: null },
    { id: 3, status: 'IDLE', isLocked: true,  endTime: null, endAt: null, reward: 400, title: '', questId: null, questType: null },
    { id: 4, status: 'IDLE', isLocked: true,  endTime: null, endAt: null, reward: 500, title: '', questId: null, questType: null },
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
  unlockQuestSlot: (id) => set((state) => {
    if (state.gold < 50000) return state;
    const updated = state.quests.map(q =>
      q.id === id ? { ...q, isLocked: false } : q
    );
    return { gold: state.gold - 50000, quests: updated, activeUnlockConfirm: null };
  }),
  setUnlockConfirm: (id) => set({
    activeUnlockConfirm: id !== null ? { isOpen: true, deskId: id } : null
  }),
  closeRewardModal: () => set({ activeRewardModal: null }),
  openComingSoonModal: (text) => set({
    comingSoonModal: { isOpen: true, text: text || "[2차 배포 후 이용 가능한 콘텐츠입니다]" }
  }),
  closeComingSoonModal: () => set({ comingSoonModal: null }),
  setResources: (gold, coffee) => set({ gold, coffee }),
  setHUDModalOpen: (open) => set({ isHUDModalOpen: open }),
  setQuestInfoModal: (data) => set({ questInfoModal: data }),
  setQuestFetchTrigger: (data) => set({ questFetchTrigger: data }),
  setCompleteQuestTrigger: (data) => set({ completeQuestTrigger: data }),
  setSessionExpiredModal: (v) => set({ sessionExpiredModal: v }),
  setDesksFromApi: (desks) => set((state) => {
    const updated = state.quests.map(q => {
      const desk = desks.find(d => d.deskTemplateId === q.id + 1);
      if (desk) return { ...q, isLocked: !desk.unlocked };
      return q;
    });
    return { quests: updated };
  }),
  // BE deskId(1-5) → store quest id(0-4)로 매핑해 IN_PROGRESS 동기화
  syncActiveQuests: (activeDesks) => set((state) => {
    // BE가 timezone 없이 반환하는 날짜 문자열을 UTC ISO로 정규화
    // "2026-03-19 15:23:49.837" → "2026-03-19T15:23:49.837Z"
    const toUtcIso = (s: string) =>
      s.includes('Z') || s.includes('+') ? s : s.replace(' ', 'T') + 'Z';

    const updated = state.quests.map(q => {
      const active = activeDesks.find(d => d.deskId === q.id + 1);
      if (active && q.status === 'IDLE') {
        const endAt = active.endAt ? toUtcIso(active.endAt) : null;
        const endTime = endAt ? new Date(endAt).getTime() : Date.now() + 60 * 60 * 1000;
        return {
          ...q,
          status: 'IN_PROGRESS' as QuestStatus,
          title: active.title,
          reward: active.rewardGold,
          questId: active.questId,
          questType: active.questType,
          endAt,
          endTime,
        };
      }
      // 이미 IN_PROGRESS/COMPLETED면 title/questId/questType/endAt 갱신
      if (active && q.status === 'IN_PROGRESS') {
        const endAt = active.endAt ? toUtcIso(active.endAt) : null;
        const endTime = endAt ? new Date(endAt).getTime() : q.endTime;
        return { ...q, title: active.title, questId: active.questId, questType: active.questType, endAt, endTime };
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
      })),
    }),
  }
));
