"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import MyPageModal from '@/components/modals/MyPageModal';

export default function OnboardingPage() {
  const { isAuthenticated, isNewUser } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    // 인증되지 않았거나 이미 온보딩을 완료한 경우 리다이렉트
    if (!isAuthenticated) {
      router.push('/');
    } else if (isNewUser === false) {
      router.push('/main');
    }
  }, [isAuthenticated, isNewUser, router]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8] font-dot font-bold">
      <MyPageModal 
        onClose={() => router.push('/')} 
        isOnboarding={true} 
      />
    </div>
  );
}
