"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import NicknameModal from '@/components/modals/NicknameModal';

export default function OnboardingPage() {
  const { isAuthenticated, isNewUser } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    } else if (isNewUser === false) {
      router.push('/');
    }
  }, [isAuthenticated, isNewUser, router]);

  return (
    <div className="fixed inset-0 bg-[#8ea4b8] font-dot font-bold">
      <NicknameModal onComplete={() => router.push('/')} />
    </div>
  );
}
