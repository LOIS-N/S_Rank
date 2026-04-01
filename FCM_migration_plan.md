# SSE → FCM 알림 전환 계획

## 개요

현재 SSE(Server-Sent Events) 방식의 실시간 알림을 FCM(Firebase Cloud Messaging)으로 전환한다.

- **SSE**: 브라우저가 서버에 직접 연결을 유지하며 알림 수신. 탭을 닫으면 알림 불가.
- **FCM**: 구글 서버를 통해 알림 전달. 탭이 닫혀있어도 알림 가능.

---

## 현재 SSE 구조 (참고용)

### 백엔드 관련 파일
| 파일 | 역할 |
|---|---|
| `BE/.../sse/presentation/SseController.java` | SSE 연결 엔드포인트 (`GET /api/v1/notifications/connect`) |
| `BE/.../sse/application/service/SseService.java` | 유저별 SseEmitter 관리, 메시지 전송 |
| `BE/.../sse/application/listener/QuestNotificationListener.java` | 퀘스트 완료 이벤트 감지 → SSE 전송 |
| `BE/.../rabbitmq/blockchain/consumer/BlockchainRequestConsumer.java` | 마켓 거래 완료 → SSE 전송 |

### 프론트엔드 관련 파일
| 파일 | 역할 |
|---|---|
| `FE/.../hooks/useSSENotification.ts` | SSE 연결 및 이벤트 수신 훅 |
| `FE/.../components/providers/AuthProvider.tsx` | useSSENotification 훅 초기화 |
| `FE/.../store/useGameStore.ts` | 알림 상태 관리 (pushNotification, markNotificationRead 등) |
| `FE/.../components/modals/NotificationModal.tsx` | 인앱 알림 목록 표시 UI |

### 현재 알림 이벤트 종류
| 이벤트 이름 | 발생 시점 | 처리 내용 |
|---|---|---|
| `quest-complete` | 퀘스트 타이머 완료 | 퀘스트 상태 완료 처리, 알림 표시 |
| `market.sell.ready` | NFT 민팅 완료 (판매 등록) | 마켓 새로고침, 알림 표시 |
| `market.sell.completed` | 판매 완료 | 마켓 새로고침, 알림 표시 |
| `market.buy.completed` | 구매 완료 | 마켓 새로고침, 알림 표시 |
| `heartbeat` | 30초마다 | 연결 유지 |

---

## 전환 작업 목록

### [준비] Firebase 프로젝트 설정

- [x] **1. Firebase Console에서 프로젝트 생성**
  - 프로젝트명: `srank` (Spark 요금제)

- [x] **2. 웹 앱 등록 (FE용)**
  - 앱 닉네임: `srank-web`
  - `firebaseConfig` 발급 완료 (projectId: `srank-5cd58`)
  - VAPID 키 발급 완료

- [x] **3. 서비스 계정 키 발급 (BE용)**
  - JSON 파일 다운로드 완료
  - `BE/srank/src/main/resources/firebase-service-account.json` 에 배치
  - `.gitignore`에 `**/firebase-service-account.json` 추가 완료

---

### [BE 작업]

- [x] **4. build.gradle에 Firebase Admin SDK 추가**
  ```groovy
  implementation 'com.google.firebase:firebase-admin:9.2.0'
  ```

- [x] **5. PostgreSQL FCM 토큰 테이블 정의**
  - `fcm/domain/entity/UserFcmToken.java` 생성
  - 테이블명: `user_fcm_token` (JPA가 자동 생성)
  - 컬럼: `id`, `user_id`(unique), `token`(512자), `created_at`, `updated_at`

- [x] **6. FCM 토큰 저장 API 만들기**
  - `fcm/repository/UserFcmTokenRepository.java` 생성
  - `fcm/presentation/FcmController.java` 생성
  - 엔드포인트: `POST /api/v1/notifications/fcm-token`
  - 요청 바디: `{ "token": "FCM토큰값" }`
  - 동작: 없으면 insert, 있으면 update

- [x] **7. Firebase Admin SDK 초기화 설정 추가**
  - `common/config/FirebaseConfig.java` 생성
  - `firebase-service-account.json`으로 초기화
  - Spring Bean으로 `FirebaseMessaging` 등록

- [x] **8. FcmService 구현**
  - `fcm/application/service/FcmService.java` 생성
  - `sendToUser(Long userId, String title, String body, Map<String, String> data)` 메서드
  - DB에서 userId로 FCM 토큰 조회 → 구글 서버에 전송

- [x] **9. 기존 SSE 전송 코드를 FcmService로 교체**
  - `QuestNotificationListener.java`: `sseService` → `fcmService` 교체 완료
  - `BlockchainRequestConsumer.java`: 3군데 교체 완료 (sell.ready, sell.completed, buy.completed)

- [ ] **10. (선택) SseController, SseService 제거**
  - 완전히 FCM으로 전환 후 SSE 관련 코드 삭제 (추후)

---

### [FE 작업]

- [ ] **11. Firebase SDK 설치**
  ```bash
  npm install firebase
  ```

- [ ] **12. Firebase 초기화 파일 작성**
  - `src/lib/firebase.ts` 파일 생성
  - Firebase Console에서 받은 `firebaseConfig`로 초기화
  - `getMessaging()` 인스턴스 생성

- [ ] **13. Service Worker 파일 작성**
  - `public/firebase-messaging-sw.js` 파일 생성
  - 백그라운드 알림 처리 담당 (탭이 닫혀있을 때)
  - Firebase SDK를 importScripts로 로드

- [ ] **14. FCM 토큰 발급 및 서버 전송 훅 작성**
  - `src/hooks/useFCMToken.ts` 파일 생성
  - `getToken(messaging, { vapidKey })` 호출로 FCM 토큰 발급
  - 발급된 토큰을 `POST /api/v1/notifications/fcm-token`으로 서버에 전송
  - 유저 로그인 시 자동 실행

- [ ] **15. 포그라운드 알림 수신 코드 작성**
  - `src/hooks/useFCMNotification.ts` 파일 생성
  - `onMessage(messaging, callback)` 으로 포그라운드 메시지 수신
  - 기존 `pushNotification()` 호출해서 인앱 알림 표시
  - 기존 게임 상태 업데이트 로직 연결 (`finishQuestByQuestId`, `triggerMarketRefresh` 등)

- [ ] **16. AuthProvider에서 SSE 훅 → FCM 훅으로 교체**
  - `useSSENotification(accessToken)` 제거
  - `useFCMToken()`, `useFCMNotification()` 추가

- [ ] **17. (선택) useSSENotification.ts 파일 제거**
  - 완전히 FCM으로 전환 후 SSE 훅 파일 삭제

---

## 주의사항

### 보안
- Firebase 서비스 계정 JSON 파일은 **절대 git에 올리지 말 것**
- `.gitignore`에 추가: `**/firebase-service-account.json`
- 환경변수 또는 서버 내부 경로에 보관

### 환경변수 (FE)
Firebase 설정값은 `.env.local`에 보관:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
```

### HTTPS 필수
- FCM은 **HTTPS 환경에서만 동작**
- 로컬 개발 시 localhost는 예외적으로 허용됨
- 배포 서버(EC2)는 이미 HTTPS이므로 문제 없음

---

## 작업 순서 권장

```
1. Firebase 프로젝트 생성 및 키 발급 (준비)
2. BE: build.gradle → DB 테이블 → FCM 토큰 API → FcmService 구현
3. FE: Firebase 설치 → 초기화 → Service Worker → 토큰 발급 훅
4. 통합 테스트: 실제 알림이 오는지 확인
5. 기존 SSE 코드 제거
```
