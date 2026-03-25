const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🔥 S-Rank 하이브리드 블록체인 생태계 완벽 테스트", function () {
  let gameToken, ledger, cardNFT, cardMarket;
  let owner, backendServer, user1, user2;

  beforeEach(async function () {
    // 가짜 지갑 계정 4개 획득 (소유자, 백엔드서버, 일반유저1, 일반유저2)
    [owner, backendServer, user1, user2] = await ethers.getSigners();

    // 1. 토큰 배포
    const GameToken = await ethers.getContractFactory("GameToken");
    gameToken = await GameToken.deploy();

    // 2. 장부 배포 및 서버 권한 세팅
    const Ledger = await ethers.getContractFactory("Ledger");
    ledger = await Ledger.deploy();
    await ledger.setServerAddress(backendServer.address, true);

    // 3. NFT 배포 및 서버 권한 세팅
    const CardNFT = await ethers.getContractFactory("CardNFT");
    cardNFT = await CardNFT.deploy();
    await cardNFT.setServer(backendServer.address, true);

    // 4. 마켓 배포
    const CardMarket = await ethers.getContractFactory("CardMarket");
    cardMarket = await CardMarket.deploy(gameToken.target, cardNFT.target);
  });

  describe("1️⃣ GameToken (기축통화) 테스트", function () {
    it("관리자(Owner)는 무에서 유를 창조해 유저에게 보상을 줄 수 있다", async function () {
      const rewardAmount = ethers.parseEther("100"); // 100 CFF
      await gameToken.mintReward(user1.address, rewardAmount);
      expect(await gameToken.balanceOf(user1.address)).to.equal(rewardAmount);
    });
  });

  describe("2️⃣ Ledger (공정성 장부) 테스트", function () {
    it("백엔드 서버만 가챠 기록을 남길 수 있다", async function () {
      await expect(
        ledger
          .connect(backendServer)
          .recordGacha(user1.address, "server123", "client456", 1, "S_RANK"),
      ).to.emit(ledger, "GachaRecorded");
    });
  });

  describe("3️⃣ CardNFT (민팅 & 소각 부활) 테스트", function () {
    it("백엔드가 권한을 주면 유저가 민팅하고, 이후 소각하면 부활 이벤트가 터진다", async function () {
      const dbCardId = "card_999";
      const ipfsUri = "ipfs://QmTest123";

      // 백엔드가 권한 부여
      await cardNFT
        .connect(backendServer)
        .grantMintRight(user1.address, dbCardId, ipfsUri);

      // 유저가 권한을 써서 민팅 (NFT 생성)
      const mintTx = await cardNFT.connect(user1).mint(dbCardId);
      const receipt = await mintTx.wait();

      // 토큰 ID 추출 (보통 0번부터 시작)
      const tokenId = 0;
      expect(await cardNFT.ownerOf(tokenId)).to.equal(user1.address);

      // 🌟 유저가 게임에서 다시 쓰기 위해 소각 (Burn Return)
      await expect(cardNFT.connect(user1).burnReturnToGame(tokenId))
        .to.emit(cardNFT, "CardReturnedToGame")
        .withArgs(user1.address, tokenId, dbCardId);
    });
  });

  describe("4️⃣ CardMarket (24시간 고정 거래소) 테스트", function () {
    let tokenId = 0;
    const price = ethers.parseEther("50"); // 50 코인

    beforeEach(async function () {
      // 마켓 테스트를 위해 user1에게 NFT를 하나 쥐어줌
      await cardNFT
        .connect(backendServer)
        .grantMintRight(user1.address, "card_777", "ipfs://Qm");
      await cardNFT.connect(user1).mint("card_777");

      // user2에게는 구매할 돈(CFF)을 쥐어줌
      await gameToken.mintReward(user2.address, ethers.parseEther("1000"));
    });

    it("정상적으로 마켓에 등록하고 다른 유저가 구매할 수 있다", async function () {
      // 1. user1이 마켓에 NFT 판매 승인 및 등록
      await cardNFT.connect(user1).approve(cardMarket.target, tokenId);
      await cardMarket.connect(user1).listCard(tokenId, price);

      // 2. user2가 마켓에 코인 지불 승인 및 구매
      await gameToken.connect(user2).approve(cardMarket.target, price);
      await cardMarket.connect(user2).buyCard(tokenId);

      // 3. 소유권이 user2로 넘어갔는지, 돈이 user1에게 들어갔는지 확인
      expect(await cardNFT.ownerOf(tokenId)).to.equal(user2.address);
      expect(await gameToken.balanceOf(user1.address)).to.equal(price);
    });

    it("24시간이 지나면 아무도 살 수 없고(입구컷), 판매자가 직접 회수해야 한다", async function () {
      // 1. user1이 마켓에 등록
      await cardNFT.connect(user1).approve(cardMarket.target, tokenId);
      await cardMarket.connect(user1).listCard(tokenId, price);

      // ⏳ 블록체인 시간을 인위적으로 25시간 뒤로 돌려버림 (Time Travel)
      await ethers.provider.send("evm_increaseTime", [25 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      // 2. 24시간 지났으니 user2가 구매 시도 -> 실패(Revert)해야 정상!
      await gameToken.connect(user2).approve(cardMarket.target, price);
      await expect(
        cardMarket.connect(user2).buyCard(tokenId),
      ).to.be.revertedWith("Listing has expired. Cannot buy.");

      // 3. 판매자(user1)가 직접 회수 시도 -> 성공! 소유권 원상복구!
      await expect(cardMarket.connect(user1).reclaimExpiredCard(tokenId))
        .to.emit(cardMarket, "CardReclaimed")
        .withArgs(user1.address, tokenId);

      expect(await cardNFT.ownerOf(tokenId)).to.equal(user1.address);
    });
  });
});
