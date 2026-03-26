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
      // evmVersion: "shanghai",
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
