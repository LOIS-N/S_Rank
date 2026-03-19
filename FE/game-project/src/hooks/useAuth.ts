"use client";

import { useEffect, useRef } from 'react';
import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { useUserStore } from '@/store/useUserStore';
import { useGameStore } from '@/store/useGameStore';
import client from '@/lib/axios';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { setAuth, setProfile, clearUser, isAuthenticated } = useUserStore();
  const router = useRouter();
  const isprocessing = useRef(false);

  // Problem 3: 토큰 준비 상태 디버그 로그
  useEffect(() => {
    console.log('[Auth] state check:', {
      ready,
      authenticated,
      isAuthenticated,
      hasIdentityToken: !!identityToken,
      hasUser: !!user,
    });
  }, [ready, authenticated, isAuthenticated, identityToken, user]);

  useEffect(() => {
    const loginToBackend = async () => {
      if (!ready) return;

      // Problem 5: Privy 세션이 만료됐는데 앱은 로그인 상태인 경우 초기화
      if (!authenticated && isAuthenticated) {
        console.log('[Auth] Privy session expired, clearing user store');
        clearUser();
        router.push('/');
        return;
      }

      // 인증은 되었지만 우리 서비스 로그인은 안 된 상태일 때 진행
      if (authenticated && !isAuthenticated && user && identityToken && !isprocessing.current) {
        try {
          isprocessing.current = true;
          const accessToken = await getAccessToken();
          if (!accessToken) return;

          console.log("[Auth] All tokens ready. Calling backend...");

          const response = await client.post('/api/v1/auth/login',
            { identityToken },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              }
            }
          );

          if (response.data.success) {
            setAuth(accessToken, response.data.data);

            if (response.data.data.isNewUser) {
              router.push('/onboarding');
            } else {
              // 기존 유저 프로필 조회
              const profileRes = await client.get('/api/v1/users/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });

              if (profileRes.data.success) {
                setProfile(profileRes.data.data);
                // GameStore 리소스 동기화 (gold -> gold, coin -> coffee)
                const { gold, coin, nickname } = profileRes.data.data;
                useGameStore.getState().setResources(gold, coin);
                useGameStore.getState().setNickname(nickname);
              }
              // Problem 2: '/main' → '/' 수정
              router.push('/');
            }
          }
        } catch (error: any) {
          // 이미 가입된 유저 (privyId 불일치로 인한 충돌) → 프로필 조회 후 메인으로
          if (error.response?.status === 409 && error.response?.data?.error?.code === 'U002') {
            console.log('[Auth] U002: already registered user, fetching profile...');
            try {
              const accessToken = await getAccessToken();
              if (!accessToken) return;
              const profileRes = await client.get('/api/v1/users/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });
              if (profileRes.data.success) {
                setAuth(accessToken, { isNewUser: false, nickname: profileRes.data.data.nickname });
                setProfile(profileRes.data.data);

                // GameStore 리소스 동기화
                const { gold, coin, nickname } = profileRes.data.data;
                useGameStore.getState().setResources(gold, coin);
                useGameStore.getState().setNickname(nickname);

                router.push('/');
              }
            } catch (profileError) {
              console.error('[Auth] Profile fetch failed after 409:', profileError);
            }
            return;
          }
          console.error('[Auth] Backend login error:', error);
          if (error.response) {
            console.error('[Auth] Error Status:', error.response.status);
            console.error('[Auth] Error Data:', error.response.data);
          }
        } finally {
          isprocessing.current = false;
        }
      }
    };

    loginToBackend();
  }, [ready, authenticated, isAuthenticated, user, identityToken, getAccessToken, setAuth, setProfile, clearUser, router]);

  return { authenticated, user };
};
