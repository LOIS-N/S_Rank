import { create } from 'zustand';

export type QuestStatus = 'IDLE' | 'IN_PROGRESS' | 'COMPLETED';

export interface DeskQuest {
  id: number;
  status: QuestStatus;
  isLocked: boolean;
  endTime: number | null; 
  reward: number;
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
  activeRewardModal: { isOpen: boolean; title: string; text: string } | null;
  activeUnlockConfirm: { isOpen: boolean; deskId: number } | null;
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
  startQuest: (id: number) => void;
  finishQuestTimer: (id: number) => void;
  completeQuest: (id: number) => void;
  unlockQuestSlot: (id: number) => void;
  setUnlockConfirm: (id: number | null) => void;
  closeRewardModal: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  gold: 100000, // 테스트 및 해금 검증을 위해 초기 골드 10만 세팅
  coffee: 0,
  nickname: '',
  walletAddress: null,
  gameStatus: 'IDLE',
  accessToken: null,
  unreadNotifications: 1, 
  quests: [
    { id: 0, status: 'IDLE', isLocked: false, endTime: null, reward: 100 },
    { id: 1, status: 'IDLE', isLocked: true,  endTime: null, reward: 200 },
    { id: 2, status: 'IDLE', isLocked: true,  endTime: null, reward: 300 },
    { id: 3, status: 'IDLE', isLocked: true,  endTime: null, reward: 400 },
    { id: 4, status: 'IDLE', isLocked: true,  endTime: null, reward: 500 },
  ],
  activeRewardModal: null,
  activeUnlockConfirm: null,
  
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
  startQuest: (id: number) => set((state) => {
    const updated = state.quests.map(q => 
      // 5초 테스트 퀘스트
      q.id === id ? { ...q, status: 'IN_PROGRESS' as QuestStatus, endTime: Date.now() + 5000 } : q
    );
    return { quests: updated };
  }),
  finishQuestTimer: (id: number) => set((state) => {
    const updated = state.quests.map(q => 
      q.id === id && q.status === 'IN_PROGRESS' ? { ...q, status: 'COMPLETED' as QuestStatus } : q
    );
    return { quests: updated };
  }),
  completeQuest: (id: number) => set((state) => {
    let rewardAcc = 0;
    const updated = state.quests.map(q => {
      if (q.id === id) {
        rewardAcc = q.reward;
        return { ...q, status: 'IDLE' as QuestStatus, endTime: null };
      }
      return q;
    });
    return { 
      quests: updated, 
      gold: state.gold + rewardAcc,
      activeRewardModal: { isOpen: true, title: "퀘스트 완료", text: `${rewardAcc.toLocaleString()} 골드를 획득하였습니다.` }
    };
  }),
  unlockQuestSlot: (id: number) => set((state) => {
    if (state.gold < 50000) return state;
    const updated = state.quests.map(q => 
      q.id === id ? { ...q, isLocked: false } : q
    );
    return { gold: state.gold - 50000, quests: updated, activeUnlockConfirm: null };
  }),
  setUnlockConfirm: (id: number | null) => set({ 
    activeUnlockConfirm: id !== null ? { isOpen: true, deskId: id } : null 
  }),
  closeRewardModal: () => set({ activeRewardModal: null }),
}));