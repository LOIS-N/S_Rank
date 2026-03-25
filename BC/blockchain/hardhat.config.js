require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.24", // 0.8.24 이상으로 설정되어 있는지 확인!
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // [핵심] 최신 명령어인 MCOPY를 인식할 수 있도록 칸쿤(Cancun) 버전으로 명시
      evmVersion: "cancun",
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    ssafy: {
      url: "https://rpc.ssafy-blockchain.com",
      chainId: 31221,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // "base-sepolia": {
    //   url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    //   accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    //   chainId: 84532, // 네트워크 ID를 통한 지갑 연결 오류 방지
    //   gasPrice: 1000000000, // 1 gwei (네트워크 혼잡도 따라 조절)
    // },

    // sepolia: {
    //   url: process.env.SEPOLIA_RPC_URL,
    //   accounts: [process.env.PRIVATE_KEY],
    // },
  },
  etherscan: {
    apiKey: {
      "base-sepolia": process.env.BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};
