import { create } from 'zustand';

export type QuestStatus = 'IDLE' | 'IN_PROGRESS' | 'COMPLETED';

export interface DeskQuest {
  id: number;
  status: QuestStatus;
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
  closeRewardModal: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  gold: 0,
  coffee: 0,
  nickname: '',
  walletAddress: null,
  gameStatus: 'IDLE',
  accessToken: null,
  unreadNotifications: 1, // 테스트를 위해 안 읽은 메세지 수 1로 초기화
  quests: [
    { id: 0, status: 'IDLE', endTime: null, reward: 100 },
    { id: 1, status: 'IDLE', endTime: null, reward: 200 },
    { id: 2, status: 'IDLE', endTime: null, reward: 300 },
    { id: 3, status: 'IDLE', endTime: null, reward: 400 },
    { id: 4, status: 'IDLE', endTime: null, reward: 500 },
  ],
  activeRewardModal: null,
  
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
  closeRewardModal: () => set({ activeRewardModal: null }),
}));