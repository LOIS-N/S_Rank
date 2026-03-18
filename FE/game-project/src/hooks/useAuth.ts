"use client";

import { useEffect, useRef } from 'react';
import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { useUserStore } from '@/store/useUserStore';
import client from '@/lib/axios'; // 커스텀 인스턴스 사용
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const { authenticated, user, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { setAuth, setProfile, clearUser, isAuthenticated } = useUserStore();
  const router = useRouter();
  const isprocessing = useRef(false);

  useEffect(() => {
    const loginToBackend = async () => {
      // 인증은 되었지만 우리 서비스 로그인은 안 된 상태일 때 진행
      if (authenticated && !isAuthenticated && user && identityToken && !isprocessing.current) {
        try {
          isprocessing.current = true;
          const accessToken = await getAccessToken();
          if (!accessToken) return;

          console.log("[Auth] All tokens ready. Calling backend...");

          // 1. 백엔드 로그인 요청 (client 사용)
          // const response = await client.post('/api/v1/auth/login',
          //   { identityToken },
          //   {
          //     headers: {
          //       'Authorization': `Bearer ${accessToken}`,
          //     }
          //   }
          // );

          const response = await client.post('/api/v1/auth/login',
            { identityToken } // 헤더를 아예 제거하고 테스트
          );

          if (response.data.success) {
            setAuth(accessToken, response.data.data);

            if (response.data.data.isNewUser) {
              router.push('/onboarding');
            } else {
              // 2. 기존 유저 프로필 조회 (여기도 axios 대신 client 사용)
              const profileRes = await client.get('/api/v1/users/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });

              if (profileRes.data.success) {
                setProfile(profileRes.data.data);
              }
              router.push('/main');
            }
          }
        } catch (error: any) {
          console.error('[Auth] Backend login error:', error);
          // 에러 발생 시 상세 정보 확인을 위해 response 출력
          if (error.response) {
            console.error('[Auth] Error Data:', error.response.data);
          }
        } finally {
          isprocessing.current = false;
        }
      }
      // Privy 로그아웃 되었는데 우리 앱은 로그인 상태일 때 정리
      else if (!authenticated && isAuthenticated) {
        clearUser();
        router.push('/');
      }
    };

    loginToBackend();
  }, [authenticated, isAuthenticated, user, identityToken, getAccessToken, setAuth, setProfile, clearUser, router]);

  return { authenticated, user };
};