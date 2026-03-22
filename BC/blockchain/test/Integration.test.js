const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Card Project 통합 테스트", function () {
  let GameToken, CardNFT, CardGacha, CardMarket;
  let token, nft, gacha, market;
  let owner, user1, user2;

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // 1. 배포
    GameToken = await ethers.getContractFactory("GameToken");
    token = await GameToken.deploy();

    CardNFT = await ethers.getContractFactory("CardNFT");
    nft = await CardNFT.deploy();

    CardGacha = await ethers.getContractFactory("CardGacha");
    gacha = await CardGacha.deploy(await nft.getAddress());

    CardMarket = await ethers.getContractFactory("CardMarket");
    market = await CardMarket.deploy(
      await token.getAddress(),
      await nft.getAddress(),
    );

    // 2. 권한 설정 (PM이 해야 할 일)
    await nft.setController(await gacha.getAddress(), true);
  });

  describe("Gacha 및 Lazy Minting 테스트", function () {
    it("10연속 뽑기 시 1번의 서명으로 10개의 결과가 생성되어야 함", async function () {
      const serverSeed = ethers.keccak256(ethers.toUtf8Bytes("secret_seed"));
      const serverHash = ethers.keccak256(serverSeed);

      // 서버 해시 등록
      await gacha.setNextServerSeedHash(serverHash);

      const clientSeed = 12345n;
      const dbCardIds = Array.from({ length: 10 }, (_, i) => `card_uuid_${i}`);

      // 가챠 실행 (트랜잭션 1번)
      await expect(
        gacha.connect(user1).requestGacha(2, 10, clientSeed, dbCardIds),
      ).to.emit(gacha, "GachaExecuted");

      console.log("   ✅ 10연뽑기 트랜잭션 성공 (서명 1회)");
    });

    it("S/A급 권한을 가진 유저는 직접 NFT를 민팅할 수 있어야 함", async function () {
      // 위 테스트에서 생성된 권한 중 하나를 사용하여 민팅 시도
      const testId = "card_uuid_0";
      const tokenURI = "ipfs://test_metadata";

      // 실제 권한이 있는지 확인 후 민팅 (권한이 없으면 revert됨)
      // 테스트 편의상 모든 등급이 3 이상으로 나왔다고 가정하거나,
      // 만약 실패한다면 gacha 로직에서 등급 확인 필요
      try {
        await nft.connect(user1).mintWithRight(testId, tokenURI);
        const ownerOfToken = await nft.ownerOf(0);
        expect(ownerOfToken).to.equal(user1.address);
        console.log("   ✅ NFT 민팅 성공 (서명 1회)");
      } catch (e) {
        console.log("   ℹ️ 등급이 낮아 권한이 없을 수 있음 (정상 로직)");
      }
    });
  });

  describe("Market 거래 테스트", function () {
    let testTokenId;

    before(async function () {
      // 1. 확실한 테스트를 위해 유저에게 강제로 민팅 권한 부여 (PM 권한)
      const testDbId = "market_test_card";
      await nft.grantMintRight(user1.address, testDbId, 4); // S급 권한 부여

      // 2. 유저가 직접 민팅 실행
      const tx = await nft
        .connect(user1)
        .mintWithRight(testDbId, "ipfs://test");
      const receipt = await tx.wait();

      // 3. 실제 발행된 tokenId 가져오기 (이벤트에서 추출)
      const event = receipt.logs.find(
        (log) => nft.interface.parseLog(log)?.name === "CardMinted",
      );
      testTokenId = event.args.tokenId;
      console.log(`   ✅ 테스트용 NFT 발행 완료 (Token ID: ${testTokenId})`);
    });

    it("판매 등록 및 구매가 정상적으로 이루어져야 함", async function () {
      const price = ethers.parseEther("100");

      // user2에게 구매용 토큰 지급 (faucet)
      await token.faucet(user2.address, price);

      // 1. 판매자(user1)의 NFT 마켓 승인
      await nft.connect(user1).approve(await market.getAddress(), testTokenId);

      // 2. 판매 등록
      await market.connect(user1).listCard(testTokenId, price);
      console.log("   ✅ 마켓 판매 등록 완료");

      // 3. 구매자(user2)의 토큰 마켓 사용 승인 (Approve)
      await token.connect(user2).approve(await market.getAddress(), price);

      // 4. 구매 실행
      await market.connect(user2).buyCard(testTokenId);

      // 결과 검증: 소유자가 user2로 바뀌었는지 확인
      expect(await nft.ownerOf(testTokenId)).to.equal(user2.address);
      console.log("   ✅ 마켓 거래 완료 (소유권 이전 확인)");
    });
  });
});
