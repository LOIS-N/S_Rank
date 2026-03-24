"use client";

import { useEffect, useRef } from 'react';
import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { useUserStore } from '@/store/useUserStore';
import { useGameStore } from '@/store/useGameStore';
import client from '@/lib/axios';
import { setTokenRefresher } from '@/lib/axios';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { setAuth, setProfile, clearUser, updateAccessToken, isAuthenticated } = useUserStore();
  const router = useRouter();
  const isprocessing = useRef(false);

  // Axios 인터셉터에 토큰 갱신 함수 등록
  useEffect(() => {
    setTokenRefresher(getAccessToken);
    return () => setTokenRefresher(null);
  }, [getAccessToken]);

  // 30분마다 토큰 사전 갱신 (방치형 게임 세션 유지)
  useEffect(() => {
    if (!isAuthenticated) return;
    const REFRESH_INTERVAL = 30 * 60 * 1000; // 30분
    const id = setInterval(async () => {
      try {
        const newToken = await getAccessToken();
        if (newToken) updateAccessToken(newToken);
      } catch {
        // 갱신 실패 시 인터셉터가 다음 요청에서 처리
      }
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [isAuthenticated, getAccessToken, updateAccessToken]);

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

              // /desks API 호출 → 책상 잠금 상태 동기화
              try {
                const desksRes = await client.get('/api/v1/desks', {
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (desksRes.data.success) {
                  useGameStore.getState().setDesksFromApi(desksRes.data.data);
                }
              } catch (desksError) {
                console.error('[Desks] API error:', desksError);
              }

              // /quests/active API 호출 → 진행 중 퀘스트 동기화
              try {
                const activeRes = await client.get('/api/v1/quests/active', {
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (activeRes.data.success && Array.isArray(activeRes.data.data)) {
                  useGameStore.getState().syncActiveQuests(activeRes.data.data);
                }
              } catch (activeError) {
                console.error('[ActiveQuests] API error:', activeError);
              }

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

                // /desks API 호출 → 책상 잠금 상태 동기화
                try {
                  const desksRes = await client.get('/api/v1/desks', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                  });
                  if (desksRes.data.success) {
                    useGameStore.getState().setDesksFromApi(desksRes.data.data);
                  }
                } catch (desksError) {
                  console.error('[Desks] API error:', desksError);
                }

                // /quests/active API 호출 → 진행 중 퀘스트 동기화
                try {
                  const activeRes = await client.get('/api/v1/quests/active', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                  });
                  if (activeRes.data.success && Array.isArray(activeRes.data.data)) {
                    useGameStore.getState().syncActiveQuests(activeRes.data.data);
                  }
                } catch (activeError) {
                  console.error('[ActiveQuests] API error:', activeError);
                }

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
