import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  accessToken: string | null;   // Privy access token
  isNewUser: boolean | null;
  isAuthenticated: boolean;
  nickname: string | null;
  level: number;
  gold: number;
  coin: number;

  // Actions
  setAuth: (accessToken: string, data: { isNewUser: boolean; nickname?: string; [key: string]: any }) => void;
  setProfile: (data: { nickname: string; level: number; gold: number; coin: number }) => void;
  setNickname: (nickname: string) => void;
  finalizeOnboarding: () => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      accessToken: null,
      isNewUser: null,
      isAuthenticated: false,
      nickname: null,
      level: 1,
      gold: 0,
      coin: 0,

      // Problem 4: accessToken을 올바른 필드에 저장
      // BE 응답에 accessToken 없으므로 Privy access token을 그대로 사용
      setAuth: (accessToken, data) => set({
        accessToken: accessToken,
        isNewUser: data.isNewUser,
        nickname: data.nickname || null,
        isAuthenticated: true,
      }),

      setProfile: (data) => set({
        nickname: data.nickname,
        level: data.level,
        gold: data.gold,
        coin: data.coin,
      }),

      setNickname: (nickname) => set({ nickname }),

      finalizeOnboarding: () => set({ isNewUser: false }),

      clearUser: () => set({
        accessToken: null,
        isNewUser: null,
        isAuthenticated: false,
        nickname: null,
        level: 1,
        gold: 0,
        coin: 0,
      }),
    }),
    {
      name: 'user-storage',
      // Problem 5: isAuthenticated / accessToken은 저장하지 않음
      // 페이지 새로고침 시 Privy 세션을 기준으로 매번 재판단
      partialize: (state) => ({
        nickname: state.nickname,
        level: state.level,
        gold: state.gold,
        coin: state.coin,
      }),
    }
  )
);
