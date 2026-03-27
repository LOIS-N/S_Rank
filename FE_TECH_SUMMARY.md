# FE 주요 기술 선택 배경 정리

> 메인화면 / 튜토리얼 / SSE 알림 기반 퀘스트 완료 구현 기술 정리

---

## 1. Phaser 3 — 게임 엔진

- 픽셀아트 기반 2D 게임 렌더링이 필요해 브라우저 게임 엔진 도입
- 브라우저 API에 의존하기 때문에 SSR 비활성화 필수 → `dynamic(() => import(...), { ssr: false })`
- Zustand 상태와 연결이 필요한데 Phaser의 update 루프는 React 외부에서 동작
  → `useGameStore.getState()` 직접 접근으로 해결
- 책상 5개의 아이소메트릭 원근감 처리 : y좌표 오름차순 정렬 후 `depth` 값으로 겹침 제어
- 버그 이벤트, 타이머 바, 캐릭터 애니메이션 등 매 프레임 갱신이 필요한 로직은 Phaser `update()` 루프에서 처리

```
에셋 2단계 로드
  Stage 1 (즉시): 로그인 배경 (city_bg)
  Stage 2 (게임 시작 시): 배경, 책상, 캐릭터, 버그 전체
```

---

## 2. Next.js App Router — 프레임워크

- 웹 기반 게임이지만 가챠·퀘스트·카드 목록 등 복수 페이지가 필요 → App Router로 라우팅 구성
- Phaser 캔버스는 브라우저 전용이므로 SSR 비활성화, 나머지 UI 컴포넌트는 서버 컴포넌트 활용
- PWA(`@ducanh2912/next-pwa`) 적용으로 모바일 설치 및 Service Worker 등록

---

## 3. Zustand + persist 미들웨어 — 상태 관리

- 방치형 게임 특성상 새로고침 후에도 퀘스트 진행 상태가 유지되어야 함
  → `persist` 미들웨어로 `quests`, 튜토리얼 진행 상태를 `localStorage`에 저장
- 단, `gold` / `coffee`는 매 로그인 시 BE에서 최신값을 받아야 해서 저장 대상에서 제외
- Phaser update 루프 ↔ React 컴포넌트 간 공유 상태가 필요 → Zustand의 `getState()` 직접 접근

```ts
// persist 대상 (localStorage)
partialize: (state) => ({
  quests, tutorialActive, tutorialQuestStep, tutorialCards
  // gold, coffee는 저장 안 함 — 매 로그인 시 BE에서 갱신
})
```

---

## 4. Privy + Axios 인터셉터 — 인증

- Web3 지갑 + Google OAuth를 동시 지원하기 위해 Privy 도입
- Privy Access Token은 유효기간이 있어 방치형 게임에서 세션이 만료될 수 있음
  → `setInterval` 30분마다 `getAccessToken()` 사전 갱신으로 세션 유지
- 모든 API 요청에 토큰을 자동 첨부하기 위해 Axios 인터셉터에 `setTokenRefresher` 등록

```
Privy 로그인
  → BE POST /api/v1/auth/login (identityToken 전송)
  → Axios 인터셉터에 getAccessToken 등록
  → 30분마다 사전 갱신 (방치형 세션 유지)
```

---

## 5. Fetch API + ReadableStream — SSE 커스텀 구현

- 퀘스트 완료 후 사용자에게 실시간 알림을 전달해 리텐션 향상이 목적
- WebSocket은 양방향이 필요 없고 구현 비용이 높음 → 서버 → 클라이언트 단방향인 SSE 선택
- 브라우저 내장 `EventSource`는 커스텀 헤더(Authorization) 전달 불가
  → **Fetch API + ReadableStream**으로 SSE를 직접 구현

```
SSE 연결: GET /api/v1/notifications/connect
이벤트명: quest-complete

퀘스트 시작
  → BE: Redis에 questId / endAt TTL 등록
  → TTL 만료 (퀘스트 종료 시각 도달)
  → BE: SSE 스트림으로 quest-complete 이벤트 전송
  → FE: useSSENotification 수신 → 상태 갱신 + 알림 표시
```

#### 재연결 전략

| 상황 | 재연결 간격 |
|------|------------|
| 스트림 정상 종료 / 네트워크 오류 | 3초 |
| 401 Unauthorized | 10초 |
| 탭 foreground 복귀 | 500ms |

- `visibilitychange` 이벤트로 탭 복귀를 감지해 즉시 재연결 → 방치 후 돌아왔을 때 알림 누락 방지

---

## 6. Web Notification API + Service Worker — 알림

- SSE로 이벤트를 수신해도 탭이 백그라운드이면 사용자가 인지하지 못함
- OS 수준 푸시 알림으로 게임 밖에서도 퀘스트 완료를 인지할 수 있도록 Web Notification API 사용
- Android Chrome 대응을 위해 Service Worker의 `showNotification()` 우선 사용, 미지원 시 `new Notification()` fallback
- 알림 권한 없을 경우: `useGameStore.pushNotification()`으로 인앱 알림 표시

---

## 7. 튜토리얼 시스템

- 신규 유저가 게임 방법을 모르면 이탈률이 높아짐 → 온보딩 튜토리얼 필요
- 가챠 → 퀘스트 → 강화 → 합성 순서로 핵심 루프를 체험하게 설계

```
신규 가입
  → /onboarding (닉네임 입력)
  → TutorialStory (스토리 씬 8개, CRT 글리치 연출)
  → tutorialQuestStep 분기 관리 (GlobalModals)

step 1  : 가챠 3회
step 2  : 1분 퀘스트
step 31 : 강화 3회 (강화 페이지 접근 허용)
step 32 : 5분 퀘스트
step 41 : 합성 1회 (합성 페이지 접근 허용)
step 42 : 5분 퀘스트
step 99 : 완료 → BE PUT /api/v1/users/levelup
```

- 튜토리얼 카드 ID는 음수(`-1`, `-2`, `-3`) — 실제 BE 카드와 구분
- 튜토리얼 퀘스트 완료는 SSE 없이 로컬 타이머로 처리 (BE 의존 없이 흐름 보장)

---

## 8. RabbitMQ — 로깅 & 블록체인 (BE 연동)

- 로깅 : 부가적인 로직이기 때문에 비즈니스 로직과 같은 트랜잭션에 놓을 필요 없음
  → 메인 로직 완료 후 RabbitMQ 메시지 발행 → 비동기 로그 저장, 로그 실패가 롤백으로 이어지지 않음
- 블록체인 : 온체인 저장, NFT 민팅 등은 처리 시간이 길고 외부 의존성이 높음
  → 동기 호출 시 API 응답 지연 + 블록체인 오류가 게임 로직 실패로 전파되는 문제
  → RabbitMQ 큐에 메시지 발행 → BC 모듈이 비동기 소비 → 게임 서버와 블록체인 레이어 분리

```
게임 이벤트 발생 (가챠, 퀘스트 완료 등)
  → BE: 비즈니스 로직 처리 (DB 저장, 응답 반환)
  → BE: RabbitMQ 메시지 발행
       ├── 로그 큐     → 비동기 로그 기록
       └── 블록체인 큐 → NFT 민팅 / 온체인 저장
```

---

## 9. 기술 요약표

| 기술 | 도입 이유 |
|------|----------|
| Phaser 3 | 픽셀아트 2D 게임 렌더링, 매 프레임 업데이트 필요 |
| Next.js App Router | 다중 페이지 라우팅 + SSR/CSR 혼용 |
| Zustand + persist | Phaser ↔ React 공유 상태, 새로고침 후 상태 유지 |
| Privy | Web3 지갑 + Google OAuth 통합 인증 |
| Axios 인터셉터 | 토큰 자동 첨부 + 30분 사전 갱신 |
| Fetch + ReadableStream | Authorization 헤더 필요 → EventSource 대신 SSE 직접 구현 |
| Web Notification + SW | 백그라운드 탭에서도 퀘스트 완료 알림 전달 |
| 튜토리얼 시스템 | 신규 유저 온보딩, 핵심 게임 루프 체험 유도 |
| RabbitMQ | 로깅·블록체인을 비즈니스 트랜잭션에서 분리 |