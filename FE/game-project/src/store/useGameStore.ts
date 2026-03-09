import { create } from 'zustand';

interface GameState {
  score: number;
  increaseScore: (by: number) => void;
  resetScore: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  increaseScore: (by) => set((state) => ({ score: state.score + by })),
  resetScore: () => set({ score: 0 }),
}));