"use client";

import { useCallback } from "react";
import { parseUnits } from "ethers";
import { useWallets } from "@privy-io/react-auth";
import { useContracts } from "./useContracts";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";

/**
 * 블록체인 거래소 연동 훅.
 *
 * listOnChain  — NFT 판매 등록 (nft.approve → market.listCard)
 * buyOnChain   — NFT 구매       (token.approve → market.buyCard)
 *
 * ※ mintCard(onlyOwner)는 BE 서버 지갑이 담당 → tokenId를 BE에서 받아야 함
 */
export function useTrade() {
  const { getNFTContract, getTokenContract, getMarketContract } = useContracts();
  const { wallets } = useWallets();

  /**
   * CardMarket에 대한 setApprovalForAll 상태 확인 + 미승인 시 실행
   * @returns true  → 이번에 새로 승인함
   *          false → 이미 승인되어 있었음
   */
  const checkAndApproveAll = useCallback(async (
    onStep?: (msg: string) => void,
  ): Promise<boolean> => {
    const userAddress =
      wallets.find((w) => w.walletClientType === "privy")?.address ??
      wallets[0]?.address;
    if (!userAddress) throw new Error("지갑이 연결되지 않았습니다.");

    const nft = await getNFTContract();
    const isApproved: boolean = await nft.isApprovedForAll(
      userAddress,
      CONTRACT_ADDRESSES.CARD_MARKET,
    );
    if (isApproved) return false;

    onStep?.("거래 활성화 중...");
    const tx = await nft.setApprovalForAll(CONTRACT_ADDRESSES.CARD_MARKET, true);
    await tx.wait();
    return true;
  }, [getNFTContract, wallets]);

  /**
   * 판매 등록 온체인 처리
   * @param tokenId  BE mint API가 반환한 NFT tokenId
   * @param price    CFF 단위 가격 (정수, ex: 1000 → 1000 CFF)
   * @param onStep   현재 진행 단계 콜백 ("승인 중..." | "등록 중...")
   */
  const listOnChain = useCallback(async (
    tokenId: number,
    price: number,
    onStep?: (msg: string) => void,
  ) => {
    const nft    = await getNFTContract();
    const market = await getMarketContract();
    const priceWei = parseUnits(price.toString(), 18);

    // 1. CardMarket이 NFT를 에스크로로 가져갈 수 있도록 approve
    onStep?.("NFT 승인 중...");
    const approveTx = await nft.approve(CONTRACT_ADDRESSES.CARD_MARKET, tokenId);
    await approveTx.wait();

    // 2. 판매 등록 — CardMarket이 NFT를 내부 보관 후 listCard 완료
    onStep?.("판매 등록 중...");
    const listTx = await market.listCard(tokenId, priceWei);
    await listTx.wait();

    return listTx.hash as string;
  }, [getNFTContract, getMarketContract]);

  /**
   * 구매 온체인 처리
   * @param tokenId   구매할 NFT의 tokenId
   * @param price     CFF 단위 가격 (정수)
   * @param onStep    현재 진행 단계 콜백
   */
  const buyOnChain = useCallback(async (
    tokenId: number,
    price: number,
    onStep?: (msg: string) => void,
  ) => {
    const token  = await getTokenContract();
    const market = await getMarketContract();
    const priceWei = parseUnits(price.toString(), 18);

    // 1. CardMarket이 토큰을 가져갈 수 있도록 approve
    onStep?.("토큰 승인 중...");
    const approveTx = await token.approve(CONTRACT_ADDRESSES.CARD_MARKET, priceWei);
    await approveTx.wait();

    // 2. 구매 — 토큰 지불 + NFT 전송이 원자적으로 처리됨
    onStep?.("구매 처리 중...");
    const buyTx = await market.buyCard(tokenId);
    await buyTx.wait();

    return buyTx.hash as string;
  }, [getTokenContract, getMarketContract]);

  return { listOnChain, buyOnChain, checkAndApproveAll };
}