import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import PrivyProviderWrapper from "@/components/providers/PrivyProviderWrapper";
import AuthProvider from "@/components/providers/AuthProvider";
import BottomNavBar from "@/components/BottomNavBar";
import GlobalModals from "@/components/GlobalModals";
import ZoomGuard from "@/components/ZoomGuard";
import BgmPlayer from "@/components/BgmPlayer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "S급 개발자들이 나를 따르는 이유",
  description: "최고의 스타트업을 만들어보세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/assets/icons/icon-192.png" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://auth.privy.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' https://j14e204.p.ssafy.io:8001 http://localhost:8080; connect-src 'self' https: http://localhost:8080 https://auth.privy.io wss://auth.privy.io https://j14e204.p.ssafy.io:8001; frame-src 'self' https://auth.privy.io;"
        />
        {/* Google Analytics */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className={inter.className}>
        <ZoomGuard />
        <BgmPlayer />
        {/* 세로 모드 회전 안내 — portrait 에서만 CSS로 표시 */}
        <div className="portrait-overlay">
          <span className="rotate-icon">📱</span>
          <span>화면을 가로로 돌려주세요</span>
          <span style={{ fontSize: "16px", opacity: 0.7 }}>Please rotate your device</span>
        </div>
        <div className="app-container">
          <div className="game-wrapper">
            <PrivyProviderWrapper>
              <AuthProvider>
                {children}
                <BottomNavBar />
                <GlobalModals />
              </AuthProvider>
            </PrivyProviderWrapper>
          </div>
          {/* 포털 루트: game-wrapper transform 영향 없이 position:fixed 사용 가능 */}
          <div id="portal-root" />
        </div>
      </body>
    </html>
  );
}
