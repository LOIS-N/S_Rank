"use client";

import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/useUserStore';
import { useGameStore } from '@/store/useGameStore';
// TODO: BE SSE 엔드포인트 확정 후 아래 import 주석 해제
// import { useSSENotification } from '@/hooks/useSSENotification';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // 전역에서 로그인 상태 및 백엔드 연동 감시
  useAuth();

  const { isAuthenticated, isNewUser } = useUserStore();
  const { accessToken } = useGameStore();

  // TODO: BE SSE 엔드포인트 확정 후 아래 한 줄 주석 해제
  // useSSENotification(accessToken);
  void accessToken;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. 인증은 되었는데 isNewUser가 true인 유저가 다른 곳에 있다면 /onboarding으로 강제 이동
    if (isAuthenticated && isNewUser === true && pathname !== '/onboarding') {
      console.log("[Guard] New user detected, redirecting to /onboarding");
      router.push('/onboarding');
    }
    
    // 2. 반대로 이미 온보딩을 끝낸 유저(isNewUser: false)가 /onboarding에 접속하려 하면 /main으로 이동 (선택 사항)
    if (isAuthenticated && isNewUser === false && pathname === '/onboarding') {
      console.log("[Guard] Already onboarded, redirecting to /main");
      router.push('/main');
    }
  }, [isAuthenticated, isNewUser, pathname, router]);

  return <>{children}</>;
}
