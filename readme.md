# S급 개발자들이 나를 따르는 이유에 대하여

> SSAFY 14기 블록체인 트랙 2반 4팀 프로젝트
> 픽셀아트 스타트업 경영 시뮬레이션 + Web3 카드 수집 게임

![city background](FE/game-project/public/assets/001/city_bg.webp)

🔗 **배포 URL**: https://j14e204.p.ssafy.io

---

## ✨ 주요 기능

- 🃏 **S급 카드 수집 (가챠)** — 전단지/박람회/공채 3종 뽑기, 등급별 확률 기반 카드 획득
- 🏢 **퀘스트 (방치형 경영)** — 카드 3~5장을 팀에 배치하고 스타트업 프로젝트를 수행
- ⚔️ **카드 강화 / 합성** — 등급 업그레이드, 최대 +49 강화로 능력치 상승
- 🌐 **NFT 거래** — S등급 카드를 ERC-721 NFT로 민팅하고 에스크로 기반 유저 간 거래
- 🏆 **랭킹** — 골드 / 카드 등급 / 카드 능력치 3종 실시간 랭킹
- 🔐 **Web3 인증** — Privy를 통한 Google OAuth + Embedded Wallet 통합 로그인

---

## 🛠 기술 스택

| 분야 | 기술 |
|------|------|
| **프론트엔드** | Next.js 15 (App Router), TypeScript, Phaser 3, Zustand, Tailwind CSS 4 |
| **인증** | Privy (Google OAuth + Web3 Embedded Wallet) |
| **백엔드** | Spring Boot 3.5, Java 17, JPA, QueryDSL, Spring Batch |
| **데이터베이스** | PostgreSQL (운영), H2 (테스트) |
| **블록체인** | Hardhat, Solidity, ERC-721 (SCardNFT), ERC-20 (GameToken), CardMarket |
| **인프라** | Jenkins, Docker Compose, Prometheus, Sentry, Mattermost Webhook |

---

## 👥 팀 구성

| 역할 | 이름 |
|------|------|
| FE | 김민성, 엄송현 |
| BE | 김수미, 이수진, 최수원 |
| INF | 서기현 |
| BC | 김수미, 엄송현 |

---

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 18 이상
- Java 17
- PostgreSQL
- Privy 앱 계정
- OpenAI API 키 (GMS)

### 1. 저장소 클론

```bash
git clone https://lab.ssafy.com/s14-blochain-sub1/S14P21E204.git
cd S14P21E204
```

### 2. 프론트엔드 설정

```bash
cd FE/game-project
npm install
cp .env.example .env.local
```

`.env.local`에 아래 값 입력:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_ga_id
```

개발 서버 실행:

```bash
npm run dev
```

브라우저에서 확인: http://localhost:3000

### 3. 백엔드 설정

```bash
cd BE/srank
cp .env.example .env
```

`.env`에 아래 값 입력:

```env
DB_URL=jdbc:postgresql://localhost:5432/srank
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
OPENAI_BASE_URL=your_gms_openai_url
OPENAI_API_KEY=your_openai_key
PRIVY_APP_ID=your_privy_app_id
PRIVY_ISSUER=privy.io
PRIVY_VERIFICATION_KEY=your_privy_verification_key
SERVER_URL=http://localhost:8080
SPRING_PROFILES_ACTIVE=local
RPC_URL=your_blockchain_rpc_url
PRIVATE_KEY=your_wallet_private_key
```

개발 서버 실행:

```bash
./gradlew bootRun
```

---

## 📁 프로젝트 구조

```
S14P21E204/
├── FE/game-project/              # Next.js 15 프론트엔드
│   └── src/
│       ├── app/                  # App Router 페이지
│       │   ├── page.tsx          # 메인 게임 화면 (로그인 → 플레이 흐름)
│       │   ├── gacha/            # 카드 뽑기
│       │   ├── quest/            # 퀘스트 카드 배치
│       │   ├── card-list/        # 보유 카드 목록
│       │   ├── enhance/          # 카드 강화
│       │   ├── synthesis/        # 카드 합성
│       │   └── trade/            # NFT 거래 (개발 중)
│       ├── components/           # UI 컴포넌트
│       │   ├── GameCanvas.tsx    # Phaser 3 픽셀아트 캔버스
│       │   ├── MainHUD.tsx       # 상단 HUD (골드, 커피, 아이콘)
│       │   ├── BottomNavBar.tsx  # 하단 네비게이션
│       │   └── modals/           # 마이페이지, 랭킹, 업적 등 모달
│       ├── store/                # Zustand 상태 관리
│       │   ├── useGameStore.ts   # 메인 게임 상태 (골드/퀘스트/모달)
│       │   ├── useAuthStore.ts   # 인증 상태 (localStorage 퍼시스트)
│       │   └── useUserStore.ts   # 유저 정보
│       └── hooks/                # 커스텀 훅 (useAuth, useSSENotification)
│
├── BE/srank/                     # Spring Boot 백엔드
│   └── src/main/java/com/ssafy/srank/
│       ├── auth/                 # Privy 토큰 검증 + 로그인
│       ├── card/                 # 카드 템플릿, 유저 카드, 스킬 스탯
│       ├── gacha/                # 가챠 뽑기 로직
│       ├── quest/                # 퀘스트 + 카드 배치 검증
│       ├── ranking/              # Spring Batch 랭킹 스냅샷
│       ├── user/                 # 유저 엔티티, 닉네임, 내 정보
│       └── security/            # PrivyAuthenticationFilter
│
├── BC/blockchain/                # 스마트 컨트랙트 (Hardhat)
│   └── contracts/
│       ├── SCardNFT.sol          # S급 카드 ERC-721 NFT
│       ├── GameToken.sol         # 게임 내 ERC-20 토큰
│       ├── CardMarket.sol        # NFT 에스크로 마켓
│       └── Ledger.sol            # 온체인 원장
│
├── Jenkinsfile                   # CI/CD 파이프라인
└── readme.md
```

---

## 🏗 아키텍처 개요

### 게임 플로우

```
유저 접속
  → Privy Google 로그인 (OAuth + Embedded Wallet 자동 생성)
  → 신규 유저: 닉네임 입력 → 게임 시작
  → 기존 유저: 바로 게임 화면
      → Phaser 3 픽셀아트 오피스 렌더링
      → 카드 뽑기 → 퀘스트 배치 → 보상 수령
      → S급 카드 NFT 민팅 → 거래소에서 매매
```

### 인증 흐름

```
FE: Privy Access Token + Identity Token 전송
  → BE: PrivyTokenService가 Access Token으로 privyId 추출
  → Identity Token 서명 검증 + privyId 일치 확인
  → 신규 유저: DB 저장 후 isNewUser: true 반환
  → 이후 요청: PrivyAuthenticationFilter가 자동 인증
```

### 블록체인 연동

| 컨트랙트 | 역할 |
|---------|------|
| `SCardNFT (ERC-721)` | S급 카드 NFT 민팅 / 번 (게임 ↔ 온체인 전환) |
| `GameToken (ERC-20)` | 게임 내 코인의 온체인 표현 |
| `CardMarket` | 에스크로 기반 NFT 유저 간 거래 |
| `Ledger` | 거래 이력 온체인 기록 |

---

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/auth/login` | Privy 로그인 (공개) |
| GET | `/api/v1/users/me` | 내 정보 조회 |
| PATCH | `/api/v1/users/me/nickname` | 닉네임 수정 |
| POST | `/api/v1/gacha/draw` | 가챠 뽑기 (1회/10회) |
| GET | `/api/v1/cards` | 보유 카드 목록 (커서 페이징) |
| POST | `/api/v1/quests/main/{questId}/start` | 메인 퀘스트 시작 |
| POST | `/api/v1/quests/sub/{questId}/start` | 서브 퀘스트 시작 |
| POST | `/api/v1/quests/complete` | 퀘스트 완료 |
| GET | `/api/v1/quests/in-progress` | 진행 중 퀘스트 목록 |
| GET | `/api/v1/desks` | 책상(슬롯) 목록 |
| GET | `/api/v1/rankings/gold` | 골드 랭킹 |
| GET | `/api/v1/rankings/card-grade` | 카드 등급 수 랭킹 |
| GET | `/api/v1/rankings/card-stat` | 카드 능력치 랭킹 |

> Swagger UI: `http://localhost:8080/swagger-ui/index.html`

---

## 🔧 환경 변수

### 프론트엔드 (FE)

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_API_URL` | 백엔드 API URL |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy 앱 ID |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics ID |

### 백엔드 (BE)

| 변수명 | 설명 |
|--------|------|
| `DB_URL` | PostgreSQL JDBC URL |
| `DB_USERNAME` | DB 사용자명 |
| `DB_PASSWORD` | DB 비밀번호 |
| `OPENAI_BASE_URL` | GMS OpenAI 엔드포인트 |
| `OPENAI_API_KEY` | OpenAI API 키 (서브 퀘스트 생성) |
| `PRIVY_APP_ID` | Privy 앱 ID |
| `PRIVY_ISSUER` | Privy JWT 발급자 |
| `PRIVY_VERIFICATION_KEY` | Privy 서명 검증 공개키 |
| `SERVER_URL` | Swagger 서버 URL |
| `SPRING_PROFILES_ACTIVE` | 실행 환경 (local / prod) |
| `RPC_URL` | 블록체인 RPC 엔드포인트 |
| `PRIVATE_KEY` | 서버 지갑 개인키 |

---

## 🧪 테스트

### 프론트엔드

```bash
cd FE/game-project
npm run test     # Vitest 단위 테스트
npm run lint     # ESLint
```

### 백엔드

```bash
cd BE/srank
./gradlew test
```

주요 테스트:

- `GachaControllerIntegrationTest` — 가챠 API 통합 테스트
- `RankingBatchIntegrationTest` — 랭킹 배치 통합 테스트
- `RankingControllerIntegrationTest` — 랭킹 조회 통합 테스트
- `RequiredEnvironmentSmokeTest` — 필수 환경변수 존재 여부 검증

---

## 🔄 CI/CD

`develop` 브랜치에 push 시 Jenkins 파이프라인이 자동 실행됩니다.

```
push to develop
  → Jenkins: docker compose build
  → docker compose up (무중단 재배포)
  → Mattermost Webhook으로 성공/실패 알림
```

### 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `develop` | 통합 브랜치 (배포 기준) |
| `feature/*` | 기능 개발 브랜치 |
| `fix-*` | 버그 수정 브랜치 |

---

## 🚀 배포

| 컴포넌트 | 환경 | 비고 |
|---------|------|------|
| 프론트엔드 | Docker (Nginx) | `j14e204.p.ssafy.io` |
| 백엔드 | Docker (JVM) | Spring Boot 3.5 |
| DB | PostgreSQL | Docker Compose 내부 |
| 모니터링 | Prometheus + Sentry | Actuator 엔드포인트 노출 |

---


## 📝 개발 명령어 요약

```bash
# 프론트엔드
cd FE/game-project
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run test     # 테스트

# 백엔드
cd BE/srank
./gradlew bootRun   # 개발 서버
./gradlew build     # 빌드
./gradlew test      # 테스트
```

---

## 📄 라이선스

이 프로젝트는 SSAFY 교육 과정의 결과물로, 상업적 이용을 제한합니다.