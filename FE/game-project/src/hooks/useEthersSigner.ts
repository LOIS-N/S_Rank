"use client";

import { useWallets } from "@privy-io/react-auth";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { useCallback } from "react";

/** Base Sepolia 체인 ID */
const BASE_SEPOLIA_CHAIN_ID = 84532;

/**
 * Privy 임베디드 지갑에서 ethers.js JsonRpcSigner를 꺼내주는 훅.
 *
 * 사용법:
 *   const getSigner = useEthersSigner();
 *   const signer = await getSigner();
 *   const contract = new Contract(address, abi, signer);
 */
export function useEthersSigner() {
  const { wallets } = useWallets();

  const getSigner = useCallback(async (): Promise<JsonRpcSigner> => {
    // Privy 임베디드 지갑 우선, 없으면 첫 번째 지갑(MetaMask 등) 사용
    const wallet =
      wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];

    if (!wallet) {
      throw new Error("연결된 지갑이 없습니다. 로그인 후 다시 시도해주세요.");
    }

    // Base Sepolia가 아니면 네트워크 전환 요청
    // Privy chainId 포맷: "eip155:84532"
    if (wallet.chainId !== `eip155:${BASE_SEPOLIA_CHAIN_ID}`) {
      await wallet.switchChain(BASE_SEPOLIA_CHAIN_ID);
    }

    const eip1193Provider = await wallet.getEthereumProvider();
    const ethersProvider = new BrowserProvider(eip1193Provider);
    return ethersProvider.getSigner();
  }, [wallets]);

  return getSigner;
}
