"use client";

import { Contract } from "ethers";
import { useEthersSigner } from "./useEthersSigner";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";

import GameTokenAbi    from "@/contracts/abis/GameToken.json";
import DevCardNFTAbi   from "@/contracts/abis/DevCardNFT.json";
import CardGachaAbi    from "@/contracts/abis/CardGacha.json";
import CardMarketAbi   from "@/contracts/abis/CardMarket.json";
import CardUpgradeAbi  from "@/contracts/abis/CardUpgrade.json";
import CardMergeAbi    from "@/contracts/abis/CardMerge.json";

/**
 * 컨트랙트 인스턴스 팩토리 훅.
 *
 * 각 getter는 async — 내부에서 getSigner()를 호출해 네트워크 전환을 포함.
 *
 * 사용법:
 *   const { getTokenContract, getMarketContract } = useContracts();
 *   const token = await getTokenContract();
 *   const balance = await token.balanceOf(address);
 */
export function useContracts() {
  const getSigner = useEthersSigner();

  /** ERC-20 Coffee (CFF) 토큰 */
  const getTokenContract = async () => {
    const signer = await getSigner();
    return new Contract(CONTRACT_ADDRESSES.GAME_TOKEN, GameTokenAbi.abi, signer);
  };

  /** ERC-721 DevCardNFT */
  const getNFTContract = async () => {
    const signer = await getSigner();
    return new Contract(CONTRACT_ADDRESSES.CARD_NFT, DevCardNFTAbi.abi, signer);
  };

  /** 가챠 결과 기록 컨트랙트 (BE 서버 지갑이 호출) */
  const getGachaContract = async () => {
    const signer = await getSigner();
    return new Contract(CONTRACT_ADDRESSES.CARD_GACHA, CardGachaAbi.abi, signer);
  };

  /**
   * NFT 거래소 컨트랙트
   *
   * 판매 등록 플로우:
   *   1. nft.approve(CARD_MARKET, tokenId)
   *   2. market.listCard(tokenId, price)   ← CardMarket이 NFT를 에스크로 보관
   *
   * 구매 플로우:
   *   1. token.approve(CARD_MARKET, price)
   *   2. market.buyCard(tokenId)           ← 토큰 지불 + NFT 전송 동시 처리
   */
  const getMarketContract = async () => {
    const signer = await getSigner();
    return new Contract(CONTRACT_ADDRESSES.CARD_MARKET, CardMarketAbi.abi, signer);
  };

  /** 카드 강화 컨트랙트 */
  const getUpgradeContract = async () => {
    const signer = await getSigner();
    return new Contract(CONTRACT_ADDRESSES.CARD_UPGRADE, CardUpgradeAbi.abi, signer);
  };

  /** 카드 합성 컨트랙트 */
  const getMergeContract = async () => {
    const signer = await getSigner();
    return new Contract(CONTRACT_ADDRESSES.CARD_MERGE, CardMergeAbi.abi, signer);
  };

  return {
    getTokenContract,
    getNFTContract,
    getGachaContract,
    getMarketContract,
    getUpgradeContract,
    getMergeContract,
  };
}
