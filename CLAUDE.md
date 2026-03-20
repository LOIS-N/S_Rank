# S14P21E204 — S급 개발자들이 나를 따르는 이유에 대하여

> SSAFY 14기 블록체인 트랙 프로젝트. 픽셀아트 스타트업 경영 시뮬레이션 게임.

---

## 프로젝트 개요

유저가 S급 개발자 카드를 뽑고, 퀘스트에 배치해 스타트업을 키우는 웹 기반 게임.
Privy를 통한 Web3 지갑 인증 + Google OAuth 로그인을 지원한다.

| 항목 | 내용 |
|------|------|
| 서비스명 | S급 개발자들이 나를 따르는 이유에 대하여 |
| 배포 URL | https://j14e204.p.ssafy.io:8001 (CSP 화이트리스트에 명시) |
| GitLab | https://lab.ssafy.com/s14-blochain-sub1/S14P21E204.git |
| 브랜치 전략 | `develop` ← feature 브랜치 PR 병합, `fix-login` 등 bugfix 브랜치 운용 |
| CI/CD | Jenkins → docker compose build/up (develop 브랜치 push 시 자동 배포) |
| 알림 | Mattermost Webhook (배포 성공/실패) |

---

## 모노레포 구조

```
S14P21E204/
├── FE/game-project/     # Next.js 15 (App Router) 프론트엔드
├── BE/srank/            # Spring Boot 3.5 백엔드
├── BC/blockchain/       # 블록체인 관련 (artifacts, cache — Hardhat 빌드 산출물)
├── Jenkinsfile          # CI/CD 파이프라인
├── config.toml          # GitLab Runner 설정
└── ai_reviewer.py       # AI 코드 리뷰 스크립트
```

---

## FE — `FE/game-project/`

### 기술 스택

| 항목 | 버전/라이브러리 |
|------|----------------|
| Framework | Next.js 16.1.6 (App Router, React 19) |
| Language | TypeScript 5.9.3 |
| 게임 엔진 | Phaser 3.90.0 |
| 상태 관리 | Zustand 5.0.11 |
| 인증 | @privy-io/react-auth 3.17.0, next-auth 4.24.13 |
| HTTP | Axios 1.13.6 |
| 스타일 | Tailwind CSS 4, CSS Modules |
| PWA | @ducanh2912/next-pwa |
| 모니터링 | Sentry (@sentry/nextjs) |
| 테스트 | Vitest 4.1.0 + @testing-library/react |
| 빌드 | next build (webpack 모드: `next dev --webpack`) |

### 디렉터리 구조

```
src/
├── app/
│   ├── page.tsx              # 메인 페이지 (로그인 → 닉네임 → 게임 흐름)
│   ├── layout.tsx            # 루트 레이아웃 (PrivyProvider, AuthProvider, BottomNavBar, GlobalModals)
│   ├── gacha/page.tsx        # 뽑기 페이지
│   ├── quest/page.tsx        # 퀘스트 선택 + 카드 배치 페이지
│   ├── card-list/page.tsx    # 카드 목록 페이지
│   └── onboarding/page.tsx   # 온보딩 페이지
├── components/
│   ├── GameCanvas.tsx        # Phaser 3 캔버스 (SSR 비활성화, dynamic import)
│   ├── MainHUD.tsx           # 상단 HUD (골드, 커피, 아이콘 버튼들)
│   ├── BottomNavBar.tsx      # 하단 네비게이션 바
│   ├── UIOverlay.tsx         # UI 오버레이
│   ├── GlobalModals.tsx      # 전역 모달 관리 (보상, 잠금 해제 확인, Coming Soon)
│   ├── ZoomGuard.tsx         # 브라우저 줌 방지
│   └── modals/
│       ├── MyPageModal.tsx
│       ├── RankingModal.tsx
│       ├── DiscordModal.tsx
│       ├── NotificationModal.tsx
│       └── AchievementModal.tsx
├── store/
│   ├── useGameStore.ts       # 메인 게임 상태 (금/커피/닉네임/퀘스트/모달 등)
│   ├── useAuthStore.ts       # 인증 상태 (persist 미들웨어, localStorage)
│   └── useUserStore.ts       # 유저 정보
├── hooks/
│   └── useAuth.ts
├── lib/
│   └── axios.ts              # Axios 인스턴스
└── test/
    └── auth.test.ts
```

### 게임 플로우 (page.tsx)

```
IDLE (로그인 전)
  → Privy Google 로그인
  → 서버 동기화 (현재 FE 단독 Mock 모드)
    → 신규 유저: NICKNAME_INPUT → 닉네임 설정 → PLAYING
    → 기존 유저: PLAYING
```

**Mock 모드 주의**: `page.tsx`의 `syncWithBackend()`는 현재 FE 단독 테스트를 위해
실제 BE 호출이 주석 처리되어 있고 `localStorage`로 모킹 중이다.
BE 연동 시 주석 해제 후 활성화 필요.

### 상태 관리 (useGameStore)

- `gameStatus`: `'IDLE' | 'NICKNAME_INPUT' | 'PLAYING'`
- `gold`: 게임 내 골드 (초기값 100,000 — 테스트용)
- `coffee`: 커피 카운터
- `quests[]`: 5개 책상 슬롯 (id 0번만 초기 해금, 1~4번 잠금)
  - `status`: `'IDLE' | 'IN_PROGRESS' | 'COMPLETED'`
  - 슬롯 해금 비용: 50,000G
- 모달 상태: `activeRewardModal`, `activeUnlockConfirm`, `comingSoonModal`

### Phaser 캔버스 (GameCanvas.tsx)

- 해상도: 1920×1080, pixelArt 렌더링
- 시간대별 배경: 오전(bg_001/ofc_001), 황혼(bg_002/ofc_002), 야간(bg_003/ofc_003)
- 책상 5개 레이어 깊이 분리 (Depth: 1000/2000/3000)
- 책상 상태 아이콘: `new_001`(퀘스트 시작) / `result_001`(완료) / `lock_001`(잠금)
- 캐릭터 애니메이션: 200ms 간격 2프레임 (`people{n}_001`, `people{n}_002`)
- Zustand store에 직접 접근: `useGameStore.getState()` (Phaser update loop 내)

### 라우팅 (App Router)

| 경로 | 설명 |
|------|------|
| `/` | 메인 게임 화면 |
| `/quest` | 퀘스트 선택 + Phase2 카드 배치 |
| `/gacha` | 뽑기 화면 (전단지/박람회/공채 탭, 박람회·공채는 Coming Soon) |
| `/card-list` | 카드 목록 |
| `/onboarding` | 온보딩 |

### UI 컨벤션

- **cqw 단위**: `game-wrapper` 너비의 1% 기준 (1280px → 1cqw=12.8px)
- **NineSliceBox**: 픽셀아트 9-slice 박스 컴포넌트 (quest, gacha 페이지에서 공통 사용)
- 에셋 경로: `/assets/001/`, `/assets/002/`, `/assets/003-01/`, `/assets/003-02/`, `/assets/006/`

### 환경변수 (FE)

```
NEXT_PUBLIC_API_URL          # BE API URL (기본: http://localhost:8080)
NEXT_PUBLIC_GA_MEASUREMENT_ID # Google Analytics ID
NEXT_PUBLIC_PRIVY_APP_ID     # Privy App ID
```

---

## BE — `BE/srank/`

### 기술 스택

| 항목 | 버전/라이브러리 |
|------|----------------|
| Framework | Spring Boot 3.5.11 |
| Language | Java 17 |
| ORM | Spring Data JPA + QueryDSL 5.0.0 |
| DB | PostgreSQL (운영), H2 (테스트) |
| 인증 | Privy JWT 검증 (jjwt 0.11.5) |
| Security | Spring Security (Stateless, PrivyAuthenticationFilter) |
| 배치 | Spring Batch |
| API 문서 | SpringDoc OpenAPI 2.8.4 (Swagger UI) |
| 모니터링 | Sentry (sentry-spring-boot-starter-jakarta 7.x) |
| 빌드 | Gradle |

### 패키지 구조 (`com.ssafy.srank`)

```
auth/         # Privy 토큰 검증 + 로그인/신규 유저 등록
card/         # 카드 템플릿, 유저 카드, 스킬 스탯 (QueryDSL 커서 페이징)
desk/         # 책상 템플릿 + 유저 책상 슬롯
gacha/        # 가챠 뽑기 로직 (FlyerGachaPolicy, GachaRandomProvider)
quest/        # 메인/서브 퀘스트 + 카드 배치 검증 + 스케줄러
ranking/      # Spring Batch 기반 랭킹 스냅샷 생성 (금/카드등급/카드능력치)
log/          # 이력 엔티티들 (가챠/강화/합성/퀘스트/골드 등)
user/         # 유저 엔티티, 닉네임 수정, 내 정보 조회
common/       # 공통 예외(BusinessException/ErrorCode), BaseEntity, ApiResponse
security/     # PrivyAuthenticationFilter, SecurityConfig, SecurityUtil
```

### 핵심 도메인

#### User
- `privyId`, `email`, `walletAddress` — 유니크 제약
- `gold`, `coin`, `level`, `nickname`
- `deletedAt` — soft delete (탈퇴)
- `spendGold(amount)` — 가챠/강화/합성에서 재사용하는 도메인 메서드

#### 인증 흐름
1. FE에서 Privy Access Token (Bearer) + Identity Token (request body) 전송
2. `PrivyTokenService`가 Access Token → privyId 추출, Identity Token 검증
3. privyId 불일치 시 `TOKEN_INVALID` 예외
4. 신규 유저면 저장 후 `isNewUser: true` 반환, 기존 유저면 `false` 반환
5. 이후 요청은 `PrivyAuthenticationFilter`가 Access Token으로 인증

**공개 엔드포인트**: `POST /api/v1/auth/login`, Swagger UI (`/swagger-ui/**`)

#### 가챠 (FlyerGachaPolicy)
- 현재 `FLYER` 타입만 활성화 (FAIR, PUBLIC은 잠금)
- 1회/10회 뽑기
- 카드 인벤토리 최대 200개
- 등급별 확률로 CardTemplate 선택 → SkillStat 3개(랜덤 포지션) 생성
- `user.spendGold(cost)` 호출

#### 퀘스트 (QuestFacadeService)
- 메인 퀘스트: 카드 3~5장 배치, 스킬 스탯이 요구치의 50% 이상 필요
- 서브 퀘스트: 동일 구조
- 카드 중복 사용 방지 (메인/서브 퀘스트 테이블 교차 검증)
- 책상 해금 여부 검증
- 완료 시간 하드캡 검증 (template.durationMinutes 초과 불가)
- `UserDeskQuest` 테이블은 추후 제거 예정 (코드 내 TODO 주석)

#### 랭킹 (Spring Batch)
- 배치 Job이 주기적으로 실행 → 3종 스냅샷 테이블 갱신
  - `UserGoldRankingSnapshot` — 골드 순위
  - `UserCardGradeRankingSnapshot` — S/A 카드 수 순위
  - `CardStatTotalRankingSnapshot` — 카드 능력치 합산 순위
- 조회는 스냅샷만 읽음 (실시간 집계 없음)

### API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/auth/login` | Privy 로그인 (공개) |
| GET | `/api/v1/users/me` | 내 정보 조회 |
| PATCH | `/api/v1/users/me/nickname` | 닉네임 수정 |
| POST | `/api/v1/gacha/draw` | 가챠 뽑기 |
| GET | `/api/v1/cards` | 유저 카드 목록 (커서 페이징) |
| POST | `/api/v1/quests/main/{questId}/start` | 메인 퀘스트 시작 |
| POST | `/api/v1/quests/sub/{questId}/start` | 서브 퀘스트 시작 |
| POST | `/api/v1/quests/complete` | 퀘스트 완료 |
| GET | `/api/v1/quests/in-progress` | 진행 중 퀘스트 목록 |
| GET | `/api/v1/rankings/gold` | 골드 랭킹 |
| GET | `/api/v1/rankings/card-grade` | 카드 등급 수 랭킹 |
| GET | `/api/v1/rankings/card-stat` | 카드 능력치 랭킹 |
| GET | `/api/v1/desks` | 책상 목록 |

### 환경변수 (BE, `.env` 또는 시스템 환경변수)

```
DB_URL, DB_USERNAME, DB_PASSWORD   # PostgreSQL 접속 정보
OPENAI_BASE_URL, OPENAI_API_KEY    # AI 서브 퀘스트 생성용 (GMS OpenAI)
PRIVY_APP_ID, PRIVY_ISSUER, PRIVY_VERIFICATION_KEY
SPRING_PROFILES_ACTIVE             # Sentry 환경 구분
```

### 테스트

- H2 인메모리 DB (`src/test/resources/application-test.properties`)
- `GachaControllerIntegrationTest`, `RankingBatchIntegrationTest`, `RankingControllerIntegrationTest`
- `RequiredEnvironmentSmokeTest` — 필수 환경변수 존재 여부 검증
- `./gradlew test` 실행

---

## BC — `BC/blockchain/`

- Hardhat 기반 스마트 컨트랙트 (artifacts, cache 디렉터리만 현재 커밋됨)
- 블록체인 연동 상세는 BC 팀 담당

---

## 개발 명령어

### FE

```bash
cd FE/game-project
npm run dev      # 개발 서버 (webpack 모드)
npm run build    # 프로덕션 빌드
npm run test     # Vitest 단위 테스트
npm run lint     # ESLint
```

### BE

```bash
cd BE/srank
./gradlew bootRun   # 개발 서버
./gradlew build     # 빌드
./gradlew test      # 테스트
```

---

## 주의사항 / 알려진 이슈

1. **FE Mock 모드**: `FE/game-project/src/app/page.tsx`의 `syncWithBackend()`는 BE 연동이 주석 처리된 상태. 실제 연동 시 해당 주석 해제 필요.
2. **UserDeskQuest 테이블**: 코드 내 여러 TODO 주석 — 추후 제거 예정 테이블.
3. **Redis/RabbitMQ**: `application.properties`에 주석 처리됨 — 현재 미사용.
4. **서브 퀘스트 카드 스탯 검증**: `validateCardStatsForSubQuest()`가 미완성 (빈 구현체).
5. **이전 퀘스트 선행 조건 검증**: `validatePreviousQuestCompleted()` 주석 처리됨.
6. **퀘스트 보상 증가**: `completeQuest()` 내 TODO — 보상 지급 로직 미구현.
7. **카드 스킬 타입 매핑**: `getCardStatByType()`에서 BE/FE/DEVOPS → stat1/stat2/stat3 하드코딩 (enum으로 교체 필요).
8. **CSP**: `layout.tsx`의 `Content-Security-Policy`에 허용 도메인이 하드코딩되어 있음.
