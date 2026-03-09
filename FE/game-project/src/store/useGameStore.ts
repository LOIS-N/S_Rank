import { create } from 'zustand';

interface GameState {
  score: number;
  nickname: string;
  gameStatus: 'IDLE' | 'NICKNAME_INPUT' | 'PLAYING';
  increaseScore: (by: number) => void;
  resetScore: () => void;
  login: () => void;
  setNickname: (name: string) => void;
  startGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  nickname: '',
  gameStatus: 'IDLE',
  increaseScore: (by) => set((state) => ({ score: state.score + by })),
  resetScore: () => set({ score: 0 }),
  login: () => set({ gameStatus: 'NICKNAME_INPUT' }),
  setNickname: (name) => set({ nickname: name }),
  startGame: () => set({ gameStatus: 'PLAYING' }),
}));