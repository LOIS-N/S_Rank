import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserData {
  isNewUser: boolean;
  [key: string]: any;
}

interface AuthState {
  user: UserData | null;
  identityToken: string | null;
  isAuthenticated: boolean;
  isNewUser: boolean | null;
  setAuth: (token: string, userData: UserData) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      identityToken: null,
      isAuthenticated: false,
      isNewUser: null,
      setAuth: (token, userData) => set({ 
        identityToken: token, 
        user: userData, 
        isAuthenticated: true,
        isNewUser: userData.isNewUser
      }),
      clearAuth: () => set({ 
        user: null, 
        identityToken: null, 
        isAuthenticated: false,
        isNewUser: null
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
