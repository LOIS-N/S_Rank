import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  // 상태 정보
  identityToken: string | null;
  accessToken: string | null; 
  isNewUser: boolean | null;
  isAuthenticated: boolean;
  nickname: string | null;
  level: number;
  gold: number;
  coin: number;
  
  // Actions
  setAuth: (token: string, data: { isNewUser: boolean; nickname?: string; [key: string]: any }) => void;
  setProfile: (data: { nickname: string; level: number; gold: number; coin: number }) => void;
  setNickname: (nickname: string) => void;
  finalizeOnboarding: () => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      identityToken: null,
      accessToken: null,
      isNewUser: null,
      isAuthenticated: false,
      nickname: null,
      level: 1,
      gold: 0,
      coin: 0,

      setAuth: (token, data) => set({
        identityToken: token,
        isNewUser: data.isNewUser,
        nickname: data.nickname || null,
        isAuthenticated: true,
        accessToken: data.accessToken || token 
      }),

      setProfile: (data) => set({
        nickname: data.nickname,
        level: data.level,
        gold: data.gold,
        coin: data.coin
      }),

      setNickname: (nickname) => set({ nickname }),

      finalizeOnboarding: () => set({ isNewUser: false }),

      clearUser: () => set({
        identityToken: null,
        accessToken: null,
        isNewUser: null,
        isAuthenticated: false,
        nickname: null,
        level: 1,
        gold: 0,
        coin: 0
      }),
    }),
    {
      name: 'user-storage',
    }
  )
);
