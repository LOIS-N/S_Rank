# BC — 블록체인 스마트 컨트랙트

> Hardhat 기반 Solidity 컨트랙트. Base Sepolia 테스트넷 배포 완료.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 언어 | Solidity 0.8.24 |
| 프레임워크 | Hardhat 2.22.3 |
| 표준 라이브러리 | OpenZeppelin Contracts 5.6.1 (ERC20, ERC721URIStorage, ERC721Burnable) |
| EVM 버전 | Cancun (MCOPY, prevrandao 지원) |
| 네트워크 | Base Sepolia (chainId: 84532, RPC: https://sepolia.base.org) |
| 테스트 | Hardhat Test (ethers.js v6) |
| 컴파일 최적화 | Optimizer enabled, runs: 200 |

---

## 배포 주소 (Base Sepolia)

```
GAME_TOKEN:   0xF2B75A0cd51500BF7440194bDDc16b3fA1C57f9C
CARD_NFT:     0x103a89a124005502E43FEcef336169584f4d6c55
CARD_GACHA:   0x86eD62b942dD66d1b79a91E62A9b48004bD9611a
CARD_UPGRADE: 0xfF2D1114EcA3F192b58beB377dD376e5711a9005
CARD_MERGE:   0x4913d18cFd2af63557C193D0c807902345646a18
CARD_MARKET:  0xfC56609B7Bc1aDf81DF1CaC69Cd9CEFe643385dC
```

---

## 컨트랙트 의존성 구조

```
GameToken (ERC20 CFF)
    └── CardMarket (결제 수단)

CardNFT (ERC721)
    ├── CardGacha   → grantMintRight() 호출 권한 보유
    ├── CardMerge   → grantMintRight() 호출 권한 보유
    └── CardMarket  → NFT 소유권 이전 처리
```

배포 순서: GameToken → CardNFT → CardGacha → CardUpgrade → CardMerge → CardMarket
배포 후 필수: `CardNFT.setController(gachaAddr, true)`, `CardNFT.setController(mergeAddr, true)`

---

## 기능별 상세

---

### 1. GameToken (ERC20 — CFF 토큰)

**파일**: `contracts/GameToken.sol`
**ABI**: `abi/GameToken.json`

#### 개요
게임 내 결제 수단. 심볼 CFF (Coffee), decimals 18. 초기 공급량 100,000,000 CFF (배포자에게 발행).

#### 주요 함수
| 함수 | 호출 주체 | 설명 |
|------|----------|------|
| `balanceOf(address)` | 누구나 | 잔액 조회 |
| `approve(spender, amount)` | 유저 | 지출 허용 (Market 구매 전 필수) |
| `transfer(to, amount)` | 유저 | 직접 전송 |
| `faucet(to, amount)` | 누구나 ⚠️ | 테스트용 무제한 민팅 |

#### FE 활용 방식
- HUD에 `balanceOf(userAddress)` 조회 → CFF 잔액 표시 (30초 자동 갱신)
- 마켓 구매 전 `approve(CARD_MARKET, price)` 호출 필수
- `useTokenBalance` 훅: 읽기 전용 JsonRpcProvider 사용 (서명 불필요)

#### 주의사항
- `faucet()`이 public — 누구나 무한 발행 가능. 운영 환경에서 제거 또는 `onlyOwner` 제한 필요.

---

### 2. CardNFT (ERC721 — 카드 NFT)

**파일**: `contracts/CardNFT.sol`
**ABI**: `abi/CardNFT.json`

#### 개요
S급 개발자 카드 NFT. 토큰명 "DevCard NFT" (심볼: DCN). **Lazy minting 패턴** 적용 — 가챠/합성이 권한을 부여하고, 유저가 직접 민팅.

#### 데이터 구조
```solidity
mapping(uint256 => uint8)   cardGrades;       // tokenId → 등급 (0:C, 1:B, 2:A, 3:S, 4:SS)
mapping(uint256 => string)  dbCardIds;        // tokenId → DB 카드 ID
mapping(address => bool)    isAuthorizedController; // Gacha, Merge 주소만 true
mapping(address => mapping(string => uint8)) mintRights; // [user][dbId] → 등급
```

#### 주요 함수
| 함수 | 호출 주체 | 설명 |
|------|----------|------|
| `setController(address, bool)` | Owner | Gacha, Merge 컨트랙트 권한 등록 |
| `grantMintRight(user, dbCardId, grade)` | Controller (Gacha/Merge) | 민팅 권한 부여 (A/S/SS만) |
| `mintWithRight(dbCardId, tokenURI)` | 유저 | 권한 있을 때 NFT 민팅 → tokenId 발급 |
| `approve(spender, tokenId)` | 소유자 | 마켓 등록 전 필수 |
| `ownerOf(tokenId)` | 누구나 | 소유자 확인 |

#### Lazy Minting 플로우
```
1. 유저가 가챠 → CardGacha.requestGacha() 호출
2. A/S/SS 등급 결과 시 → CardNFT.grantMintRight(user, dbCardId, grade) 자동 호출
3. 유저가 나중에 → CardNFT.mintWithRight(dbCardId, tokenURI) 직접 호출
4. tokenId 발급 (권한 자동 소멸)
```

#### 등급 체계
- C(0), B(1): 민팅 불가 (`require(grade >= 2)`)
- A(2), S(3), SS(4): 민팅 가능

#### FE 연동 현황
- `approve(CARD_MARKET, tokenId)`: 판매 등록 전 `useTrade.listOnChain`에서 호출 ✅
- `mintWithRight()`: 현재 FE 미구현 (BE가 tokenId 반환하는 구조로 우선 설계)

---

### 3. CardGacha (가챠 시스템)

**파일**: `contracts/CardGacha.sol`
**ABI**: `abi/CardGacha.json`

#### 개요
서버 시드 + 클라이언트 시드 기반 공정 난수 생성. 3가지 가챠 타입 지원. 결과는 이벤트로 emit.

#### 난수 생성 공식
```solidity
rand = keccak256(serverSeed || clientSeed || user || index || block.prevrandao) % 100
```
서버 단독, 유저 단독 조작 불가.

#### 확률 테이블
| 타입 | SS | S | A | B | C |
|------|-----|---|---|---|---|
| 0 (일반) | - | - | - | 30% | 70% |
| 1 (일반+) | - | 5% | 20% | 40% | 35% |
| 2 (프리미엄) | 2% | 9% | 29% | 40% | 20% |

#### 주요 함수
| 함수 | 호출 주체 | 설명 |
|------|----------|------|
| `setNextServerSeedHash(bytes32)` | Owner (BE 서버 지갑) | 가챠 전 서버 해시 등록 |
| `requestGacha(type, count, clientSeed, dbCardIds[])` | 유저 | 가챠 실행 |

#### 이벤트
```solidity
GachaExecuted(user, gachaType, grades[], dbCardIds[])
```

#### BE 연동 필수
- `requestGacha()` 호출 전에 BE 서버 지갑이 `setNextServerSeedHash()` 호출해야 함
- 매 가챠마다 새 해시 등록 필요 (재사용 불가 설계)

#### 현재 상태
- 컨트랙트 구현 완료 ✅
- BE에서 서버 시드 관리 로직 구현 필요 ⚠️

---

### 4. CardUpgrade (카드 강화)

**파일**: `contracts/CardUpgrade.sol`
**ABI**: `abi/CardUpgrade.json`

#### 개요
강화 확률 계산만 온체인 처리. 실제 강화 결과(능력치 상승 등)는 BE DB에서 처리.

#### 확률
- 성공률: **30% 고정**
- 최대 시도 횟수: 7단계

#### 주요 함수
| 함수 | 호출 주체 | 설명 |
|------|----------|------|
| `setNextServerSeedHash(bytes32)` | Owner (BE 서버 지갑) | 강화 전 서버 해시 등록 |
| `requestUpgrade(dbCardId, attempt, clientSeed)` | 유저 | 강화 시도 |

#### 이벤트
```solidity
UpgradeResult(user, dbCardId, success, attempt)
```

#### 현재 상태
- 컨트랙트 구현 완료 ✅
- FE 연동 미구현 (BE에서 처리 중) ⚠️
- GA 이벤트 (`card_enhance`) 삽입 위치 미정 ⚠️

---

### 5. CardMerge (카드 합성)

**파일**: `contracts/CardMerge.sol`
**ABI**: `abi/CardMerge.json`

#### 개요
3~5장의 카드를 소모해 상위 등급 카드 획득 시도. 성공 시 A등급 이상이면 Lazy minting 권한 부여.

#### 합성 확률 테이블
| 현재 등급 | 3장 | 4장 | 5장 |
|----------|-----|-----|-----|
| C → B | 60% | 70% | 80% |
| B → A | 40% | 50% | 60% |
| A → S | 25% | 30% | 35% |
| S → SS | 5% | 7% | 9% |

#### 주요 함수
| 함수 | 호출 주체 | 설명 |
|------|----------|------|
| `setNextServerSeedHash(bytes32)` | Owner (BE 서버 지갑) | 합성 전 서버 해시 등록 |
| `requestMerge(targetDbIds[], currentGrade, newDbId, clientSeed)` | 유저 | 합성 시도 |

#### 이벤트
```solidity
MergeResult(user, targetDbIds[], resultGrade, newDbId)
```

#### 현재 상태
- 컨트랙트 구현 완료 ✅
- FE 연동 미구현 ⚠️

---

### 6. CardMarket (P2P 마켓플레이스)

**파일**: `contracts/CardMarket.sol`
**ABI**: `abi/CardMarket.json`

#### 개요
유저 간 NFT 직거래. CFF 토큰으로 결제. **Escrow 패턴** — 판매 등록 시 NFT를 마켓 컨트랙트가 보관, 구매 완료 시 구매자에게 전송.

#### 데이터 구조
```solidity
struct Listing {
    address seller;
    uint256 tokenId;
    uint256 price;    // CFF 단위 (wei 기준, decimals 18)
    bool isActive;
}
mapping(uint256 => Listing) listings; // tokenId → Listing
```

#### 주요 함수
| 함수 | 호출 주체 | 선행 조건 | 설명 |
|------|----------|----------|------|
| `listCard(tokenId, price)` | 판매자 | NFT.approve(market, tokenId) | 판매 등록 + NFT 에스크로 |
| `buyCard(tokenId)` | 구매자 | Token.approve(market, price) | 구매 + NFT/토큰 원자 교환 |
| `listings(tokenId)` | 누구나 | - | 판매 정보 조회 |

#### 이벤트
```solidity
CardListed(seller, tokenId, price)
CardSold(buyer, seller, tokenId, price)
```

#### FE 판매 플로우 (useTrade.listOnChain)
```
1. BE POST /api/v1/trade/listings → { tokenId } 수령
2. CardNFT.approve(CARD_MARKET, tokenId)
3. CardMarket.listCard(tokenId, priceWei)
```

#### FE 구매 플로우 (useTrade.buyOnChain)
```
1. GameToken.approve(CARD_MARKET, priceWei)
2. CardMarket.buyCard(tokenId)
```

#### 현재 상태
- 컨트랙트 구현 완료 ✅
- FE `useTrade` 훅 구현 완료 ✅
- `trade/page.tsx` handleSell / handleBuyConfirm 연결 완료 ✅

---

## 테스트 현황

**파일**: `test/Integration.test.js`

| 테스트 케이스 | 상태 |
|---|---|
| 10연뽑기 → GachaExecuted 이벤트 emit | ✅ |
| A/S급 권한 보유 시 mintWithRight() 성공 | ✅ |
| listCard() → CardListed 이벤트 | ✅ |
| buyCard() → 소유권 이전 + CardSold 이벤트 | ✅ |
| CardUpgrade 성공/실패 케이스 | ⚠️ 미작성 |
| CardMerge 합성 케이스 | ⚠️ 미작성 |

실행: `npx hardhat test test/Integration.test.js`

---

## 알려진 이슈 및 TODO

| 항목 | 내용 | 우선순위 |
|---|---|---|
| `faucet()` 보안 | 누구나 무제한 CFF 발행 가능. onlyOwner 제한 또는 제거 필요 | 높음 |
| Lazy minting FE 연동 | `mintWithRight()` 호출 FE 미구현. BE tokenId 반환 구조와 불일치 | 높음 |
| BE 서버 시드 관리 | Gacha/Upgrade/Merge 사용 전 `setNextServerSeedHash()` 자동 호출 로직 필요 | 높음 |
| CardUpgrade FE | 강화 시도 FE 연동 미구현 | 중간 |
| CardMerge FE | 합성 시도 FE 연동 미구현 | 중간 |
| 배포 주소 자동 저장 | 배포 후 주소 수동 기록 중. scripts/deploy.js에 자동 저장 로직 추가 권장 | 낮음 |
| Owner Multisig 전환 | 현재 단일 EOA가 Owner. 운영 환경에서 Multisig 권장 | 낮음 |

---

## 개발 명령어

```bash
cd BC/blockchain

# 로컬 테스트넷 실행
npx hardhat node

# 로컬 배포
npx hardhat run scripts/deploy.js --network localhost

# Base Sepolia 배포
npx hardhat run scripts/deploy.js --network base-sepolia

# 테스트
npx hardhat test test/Integration.test.js

# 컴파일
npx hardhat compile
```

---

## 환경변수 (.env)

```
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=0x...          # 배포자(서버) 지갑 개인키
BASESCAN_API_KEY=...        # 소스코드 검증용
```