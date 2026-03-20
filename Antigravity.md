# FE Project Analysis Report (Antigravity)

## 1. 개요 (Overview)
본 프로젝트는 **"S급 개발자들이 나를 따르는 이유에 대하여"**라는 제목의 게임형 웹 애플리케이션으로, 스타트업 경영을 테마로 한 Phaser 3 기반의 브라우저 게임입니다. Next.js 프레임워크를 사용하여 견고한 웹 환경을 구축하고, Phaser를 통해 동적인 게임 경험을 제공합니다.

## 2. 기술 스택 (Tech Stack)
### Core Frameworks
- **Next.js 15.1.x+ (App Router)**: 최신 React 19 기반의 웹 프레임워크.
- **Phaser 3.90.0**: 2D 게임 엔진으로, 사무실 환경 및 캐릭터 애니메이션 구현.
- **React 19**: 컴포넌트 기반 UI 개발.

### State Management & Data
- **Zustand**: 전역 상태 관리 (Auth, Game, User 전용 스토어 분리).
- **Axios**: 백엔드 API와의 통신.
- **Privy**: Web3 및 소셜 인증을 위한 SDK 연동.

### UI/UX & Styling
- **Tailwind CSS 4**: 최신 버전의 유틸리티 퍼스트 CSS 프레임워크.
- **Pixel Art (Stardust Font)**: 복고풍 도트 디자인과 전용 폰트 사용.
- **Responsive 16:9 Layout**: 어떤 기기에서도 일정한 비율(16:9)을 유지하는 고급 레이아웃 기법 적용.

## 3. 주요 디렉토리 구조 (Directory Structure)
```text
src/
├── app/                  # Next.js 페이지 및 라우팅
│   ├── card-list/        # 보유 카드 목록 페이지
│   ├── gacha/            # 카드 뽑기 시스템 페이지
│   ├── quest/            # 퀘스트 관리 페이지
│   ├── onboarding/       # 초기 유저 닉네임 설정/가이드
│   ├── layout.tsx        # 글로벌 레이아웃 (Provider, NavBar 포함)
│   └── page.tsx          # 메인 엔트리 (로그인/게임 캔버스 결합)
├── components/           # 재사용 가능한 React 컴포넌트
│   ├── GameCanvas.tsx    # Phaser 게임 엔진 통합 핵심 컴포넌트
│   ├── MainHUD.tsx       # 게임 상단 정보창 (Gold, Coffee, Modals)
│   ├── BottomNavBar.tsx  # 하단 메뉴 네비게이션
│   ├── modals/           # 다양한 기능성 모달 (Ranking, MyPage 등)
│   └── providers/        # Context Providers (Auth, Privy)
├── store/                # Zustand 스토어 정의
│   ├── useGameStore.ts   # 게임 진행 상태, 퀘스트, 재화 관리
│   ├── useUserStore.ts   # 유저 정보 및 프로필 관리
│   └── useAuthStore.ts   # 인증 상태 관리
├── hooks/                # 커스텀 React 훅
│   └── useAuth.ts        # Privy와 BE 연동을 처리하는 핵심 인증 로직
└── lib/                  # 유틸리티 및 라이브러리 설정
    └── axios.ts          # Axios 인스턴스 설정
```

## 4. 핵심 시스템 분석 (Core Systems Analysis)

### A. Phaser 통합 (GameCanvas.tsx)
- Phaser는 `GameCanvas.tsx` 내에서 클라이언트 사이드에서만 비동기로 로드되어 SSR 문제를 방지합니다.
- 단일 씬(Scene)에서 시간대(낮/오후/밤)에 따른 배경 변화를 처리하며, 5개의 데스크를 통해 퀘스트 상태(`IDLE`, `IN_PROGRESS`, `COMPLETED`)를 시각적으로 표현합니다.
- Zustand 스토어와 직접 연동되어 게임 상태 변화가 즉시 React UI와 Phaser 캔버스에 반영됩니다.

### B. 인증 및 유저 동기화 (useAuth.ts)
- Privy SDK를 통해 소셜 로그인을 처리하며, 획득한 `identityToken`을 백엔드로 전달하여 세션을 유지합니다.
- 신규 유저와 기존 유저를 구분하여 온보딩(닉네임 설정 등) 또는 메인 게임 진입을 결정합니다.
- JWT 기반의 Access Token을 사용하여 API 요청 시 인증 헤더를 관리합니다.

### C. 레이아웃 시스템 (16:9 Aspect Ratio)
- `globals.css`에서 `game-wrapper`에 `min(100vw, calc(100vh * 16 / 9))`을 적용하여 화면 크기에 관계없이 16:9 비율을 사수합니다.
- **Container Queries (`cqw`)**를 적극 활용하여, 픽셀 기반이 아닌 화면 비율 기반의 정교한 UI 배치(HUD 브라켓 등)를 구현했습니다.

### D. 퀘스트 및 경제 시스템
- 유저는 퀘스트를 통해 Gold를 획득하며, 획득한 Gold로 잠긴 데스크 슬롯(50,000 Gold)을 해금할 수 있습니다.
- 퀘스트 진행 중에는 실시간 타이머가 표시되며, 완료 시 보상을 수령하는 루프를 가집니다.

## 5. 결론 및 향후 전망
프론트엔드 코드는 매우 정돈된 상태이며, 특히 고해상도 게임 가로 비율을 유지하면서 모바일 반응형을 고려한 설계가 인상적입니다. Phaser 소스 코드가 별도의 씬 파일로 분리되지 않고 하나의 대형 컴포넌트에 포함되어 있어, 향후 게임 복잡도가 증가할 경우 씬 관리 로직을 클래스 기반으로 분리하는 리팩토링이 권장됩니다.
