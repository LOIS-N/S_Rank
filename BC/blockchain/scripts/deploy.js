console.log("🚨 1. deploy.js 스크립트 파일 진입 성공!");
const hre = require("hardhat");
console.log("🚨 2. 하드햇 모듈 로드 성공!");

async function main() {
  console.log("🚀 싸피 네트워크(31221) 배포 시작...\n");

  // 1. 인게임 재화 배포
  console.log("1️⃣ GameToken 배포 중...");
  const GameToken = await hre.ethers.getContractFactory("GameToken");
  const token = await GameToken.deploy();
  await token.waitForDeployment();
  console.log(`✅ GameToken 배포 완료! 주소: ${token.target}`);

  // 2. 공정성 기록 장부 (Ledger) 배포
  console.log("\n2️⃣ Ledger 배포 중...");
  const Ledger = await hre.ethers.getContractFactory("Ledger");
  const ledger = await Ledger.deploy();
  await ledger.waitForDeployment();
  console.log(`✅ Ledger 배포 완료! 주소: ${ledger.target}`);

  // 3. 카드 NFT 배포 (burnBatch 함수가 추가된 버전)
  console.log("\n3️⃣ CardNFT 배포 중...");
  const CardNFT = await hre.ethers.getContractFactory("CardNFT");
  const nft = await CardNFT.deploy();
  await nft.waitForDeployment();
  console.log(`✅ CardNFT 배포 완료! 주소: ${nft.target}`);

  // 4. 마켓 배포 (코인 주소 및 NFT 주소 연결 필요!)
  console.log("\n4️⃣ CardMarket 배포 중...");
  const CardMarket = await hre.ethers.getContractFactory("CardMarket");
  // token.target 이 바로 위에서 배포한 내 코인 주소입니다!
  const market = await CardMarket.deploy(token.target, nft.target);
  await market.waitForDeployment();
  console.log(`✅ CardMarket 배포 완료! 주소: ${market.target}`);

  console.log(
    "\n🎉 [배포 성공] 아래 주소들을 Spring Boot application.properties 에 복붙하세요!",
  );
  console.log(`contract.token.address=${token.target}`);
  console.log(`contract.ledger.address=${ledger.target}`);
  console.log(`contract.nft.address=${nft.target}`);
  console.log(`contract.market.address=${market.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
