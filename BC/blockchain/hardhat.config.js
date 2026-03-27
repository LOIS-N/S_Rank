require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // evmVersion: "shanghai", <- 이놈이 범인이었음 paris만 호환됨. 현재 자동 지정 상태
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    ssafy: {
      url: process.env.SSAFY_RPC_URL || "https://rpc.ssafy-blockchain.com",
      chainId: 31221,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      // gasPrice: "auto", // 자동 계산
      // gas: "auto", // 자동 계산
    },
  },
};
