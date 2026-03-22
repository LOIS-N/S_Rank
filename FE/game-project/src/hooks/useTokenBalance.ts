"use client";

import { useEffect, useState, useCallback } from "react";
import { JsonRpcProvider, Contract, formatUnits } from "ethers";
import { useWallets } from "@privy-io/react-auth";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";
import GameTokenAbi from "@/contracts/abis/GameToken.json";

/** 읽기 전용 provider — 유저 서명 불필요 */
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

/**
 * 유저 지갑의 GameToken(CFF) 온체인 잔액을 조회하는 훅.
 *
 * - 로그인한 Privy 임베디드 지갑 주소 기준으로 balanceOf 호출
 * - 30초마다 자동 갱신
 * - 지갑 미연결 시 null 반환
 */
export function useTokenBalance() {
  const { wallets } = useWallets();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const walletAddress = wallets[0]?.address ?? null;

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null);
      return;
    }
    try {
      setIsLoading(true);
      const provider = new JsonRpcProvider(BASE_SEPOLIA_RPC);
      const token = new Contract(
        CONTRACT_ADDRESSES.GAME_TOKEN,
        GameTokenAbi.abi,
        provider
      );
      const raw: bigint = await token.balanceOf(walletAddress);
      // GameToken decimals = 18 → 정수 단위로 표시
      const formatted = Math.floor(Number(formatUnits(raw, 18)));
      setBalance(formatted.toLocaleString());
    } catch (e) {
      console.error("[TokenBalance] fetch error:", e);
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, isLoading, refetch: fetchBalance };
}
