"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        // 구글 로그인만 허용
        loginMethods: ['google'],
        
        // 에러가 났던 지갑 생성 설정 부분 수정
        embeddedWallets: {
          ethereum: {              // 이 부분을 추가해서 감싸줘야 합니다!
            createOnLogin: 'users-without-wallets',
          },
        },
        
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          showWalletLoginFirst: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}