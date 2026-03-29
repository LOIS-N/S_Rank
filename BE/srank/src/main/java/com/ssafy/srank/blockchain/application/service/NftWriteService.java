package com.ssafy.srank.blockchain.application.service;

import com.ssafy.srank.blockchain.application.dto.NftMintResult;
import com.ssafy.srank.blockchain.contracts.CardMarket;
import com.ssafy.srank.blockchain.contracts.CardNFT;
import com.ssafy.srank.common.metrics.BlockchainMetrics;
import org.web3j.crypto.Credentials;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

import java.math.BigInteger;
import java.util.List;
@RequiredArgsConstructor
@Slf4j
public class NftWriteService {

    private final CardNFT cardNFT;
    private final CardMarket cardMarket;
    private final BlockchainMetrics metrics;
    private final Credentials blockchainCredentials;

    public NftMintResult mintNft(String userWallet, Long dbCardId, String tokenUri) {
        long start = System.nanoTime();
        String dbCardIdStr = String.valueOf(dbCardId);

        try {
            // 1단계: 서버 지갑에 민팅 권한 부여
            // approvedMints[서버지갑][dbCardId] = tokenUri 저장
            cardNFT.grantMintRight(
                    blockchainCredentials.getAddress(),
                    dbCardIdStr,
                    tokenUri
            ).send();

            // 2단계: 서버 지갑으로 NFT 민팅 (msg.sender = 서버지갑 = NFT 소유자)
            TransactionReceipt mintReceipt = cardNFT.mint(dbCardIdStr).send();

            List<CardNFT.CardMintedEventResponse> events = cardNFT.getCardMintedEvents(mintReceipt);
            if (events == null || events.isEmpty()) {
                throw new IllegalStateException("CardMinted 이벤트 없음 dbCardId=" + dbCardIdStr);
            }
            BigInteger tokenId = events.get(0).tokenId;

            // 3단계: CardMarket이 transferFrom 할 수 있도록 approve
            // listCard() 내부에서 nftContract.transferFrom(msg.sender, address(this), tokenId) 호출하기 때문
            cardNFT.approve(cardMarket.getContractAddress(), tokenId).send();

            metrics.recordWrite(System.nanoTime() - start, "NFT_MINT", "1", "SUCCESS", "NONE");
            return new NftMintResult(mintReceipt.getTransactionHash(), tokenId);

        } catch (Exception e) {
            metrics.recordWrite(System.nanoTime() - start, "NFT_MINT", "1", "FAIL", e.getClass().getSimpleName());
            throw new RuntimeException("NFT 민팅 실패 dbCardId=" + dbCardIdStr, e);
        }
    }

    public String listOnMarket(BigInteger tokenId, BigInteger priceCoin) {
        long start = System.nanoTime();

        try {
            TransactionReceipt receipt = cardMarket.listCard(tokenId, priceCoin).send();

            metrics.recordWrite(
                    System.nanoTime() - start,
                    "NFT_LIST",
                    "1",
                    "SUCCESS",
                    "NONE"
            );

            return receipt.getTransactionHash();

        } catch (Exception e) {
            metrics.recordWrite(
                    System.nanoTime() - start,
                    "NFT_LIST",
                    "1",
                    "FAIL",
                    e.getClass().getSimpleName()
            );

            throw new RuntimeException("NFT 판매 등록 실패", e);
        }
    }

    public String executeBuy(BigInteger tokenId, String buyerWallet) {
        long start = System.nanoTime();

        try {
            TransactionReceipt receipt = cardMarket.buyCardFor(tokenId, buyerWallet).send();

            metrics.recordWrite(
                    System.nanoTime() - start,
                    "NFT_BUY",
                    "1",
                    "SUCCESS",
                    "NONE"
            );

            return receipt.getTransactionHash();

        } catch (Exception e) {
            metrics.recordWrite(
                    System.nanoTime() - start,
                    "NFT_BUY",
                    "1",
                    "FAIL",
                    e.getClass().getSimpleName()
            );

            throw new RuntimeException("NFT 구매 실패", e);
        }
    }
}