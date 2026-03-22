const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. GameToken (CFF) 배포
  const GameToken = await hre.ethers.getContractFactory("GameToken");
  const token = await GameToken.deploy();
  await token.waitForDeployment();
  console.log("GameToken deployed to:", await token.getAddress());

  // 2. CardNFT (DCN) 배포
  const CardNFT = await hre.ethers.getContractFactory("CardNFT");
  const nft = await CardNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("CardNFT deployed to:", nftAddress);

  // 3. CardGacha 배포 (NFT 주소 필요)
  const CardGacha = await hre.ethers.getContractFactory("CardGacha");
  const gacha = await CardGacha.deploy(nftAddress);
  await gacha.waitForDeployment();
  const gachaAddress = await gacha.getAddress();
  console.log("CardGacha deployed to:", gachaAddress);

  // 4. CardUpgrade 배포
  const CardUpgrade = await hre.ethers.getContractFactory("CardUpgrade");
  const upgrade = await CardUpgrade.deploy();
  await upgrade.waitForDeployment();
  console.log("CardUpgrade deployed to:", await upgrade.getAddress());

  // 5. CardMerge 배포 (NFT 주소 필요)
  const CardMerge = await hre.ethers.getContractFactory("CardMerge");
  const merge = await CardMerge.deploy(nftAddress);
  await merge.waitForDeployment();
  const mergeAddress = await merge.getAddress();
  console.log("CardMerge deployed to:", mergeAddress);

  // 6. CardMarket 배포 (Token & NFT 주소 필요)
  const CardMarket = await hre.ethers.getContractFactory("CardMarket");
  const market = await CardMarket.deploy(await token.getAddress(), nftAddress);
  await market.waitForDeployment();
  console.log("CardMarket deployed to:", await market.getAddress());

  // [중요] 권한 설정: Gacha와 Composer가 NFT 민팅 권한을 갖도록 설정
  console.log("Setting up permissions...");
  await nft.setController(gachaAddress, true);
  await nft.setController(mergeAddress, true);
  console.log("Permissions set successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
