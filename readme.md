# S급 개발자들이 나를 따르는 이유에 대하여

> SSAFY 14기 2반 4팀 블록체인 트랙 프로젝트
> 픽셀아트 스타트업 경영 시뮬레이션 + Web3 카드 수집 게임

---

## 서비스 소개

S급 개발자 카드를 뽑고, 팀을 꾸려 퀘스트를 수행하며 스타트업을 성장시키는 웹 기반 방치형 게임
S등급 카드는 NFT로 민팅해 유저 간 거래가 가능합니다.
![alt text](FE/game-project/public/assets/001/city_bg.webp)

🔗 **배포 URL**: https://j14e204.p.ssafy.io:8001

---

## 역할 소개

| 역할 | 이름 |
|------|------|
| FE | 김민성, 엄송현 |
| BE | 김수미, 이수진, 최수원 |
| INF | 서기현 |
| BC | 김수미, 엄송현 |

---

## 기술 스택

### Frontend
`Next.js 15` `TypeScript` `Phaser 3` `Zustand` `Tailwind CSS` `Privy`

### Backend
`Spring Boot 3.5` `Java 17` `JPA` `QueryDSL` `PostgreSQL` `Spring Batch`

### Blockchain
`Hardhat` `ERC-721` `ERC-20` `Privy Wallet SDK`

### Infra
`Jenkins` `Docker Compose` `Prometheus` `Sentry`

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| 카드 뽑기 (가챠) | 전단지 / 박람회 / 공채 3종 뽑기, VRF 기반 확률 |
| 퀘스트 | 카드 3~5장 배치 후 프로젝트 수행, 방치형 진행 |
| 카드 강화 / 합성 | 등급 업그레이드, 최대 +49 강화 |
| NFT 거래 | S등급 카드 NFT 민팅 + 에스크로 기반 유저 간 거래 |
| 랭킹 | 골드 / 카드 등급 / 카드 능력치 3종 랭킹 |

---

## 프로젝트 구조

```
S14P21E204/
├── FE/game-project/   # Next.js 15 프론트엔드
├── BE/srank/          # Spring Boot 백엔드
├── BC/blockchain/     # 스마트 컨트랙트 (Hardhat)
└── Jenkinsfile        # CI/CD 파이프라인
```
