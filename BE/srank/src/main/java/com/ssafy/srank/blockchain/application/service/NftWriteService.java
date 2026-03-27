package com.ssafy.srank.blockchain.application.service;

import com.ssafy.srank.blockchain.application.dto.NftMintResult;
import com.ssafy.srank.blockchain.contracts.CardMarket;
import com.ssafy.srank.blockchain.contracts.CardNFT;
import com.ssafy.srank.common.metrics.BlockchainMetrics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

import java.math.BigInteger;
import java.util.List;
@Service
@RequiredArgsConstructor
@Slf4j
public class NftWriteService {

    private final CardNFT cardNFT;
    private final CardMarket cardMarket;
    private final BlockchainMetrics metrics;

    public NftMintResult mintNft(String userWallet, Long dbCardId, String tokenUri) {
        long start = System.nanoTime();

        try {
            TransactionReceipt receipt = cardNFT.mint(String.valueOf(dbCardId)).send();

            List<CardNFT.CardMintedEventResponse> events = cardNFT.getCardMintedEvents(receipt);
            if (events == null || events.isEmpty()) {
                throw new IllegalStateException("CardMinted 이벤트 없음");
            }

            BigInteger tokenId = events.get(0).tokenId;

            metrics.recordWrite(
                    System.nanoTime() - start,
                    "NFT_MINT",
                    "1",
                    "SUCCESS",
                    "NONE"
            );

            return new NftMintResult(receipt.getTransactionHash(), tokenId);

        } catch (Exception e) {
            metrics.recordWrite(
                    System.nanoTime() - start,
                    "NFT_MINT",
                    "1",
                    "FAIL",
                    e.getClass().getSimpleName()
            );

            throw new RuntimeException("NFT 민팅 실패", e);
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

    public String executeBuy(BigInteger tokenId) {
        long start = System.nanoTime();

        try {
            TransactionReceipt receipt = cardMarket.buyCard(tokenId).send();

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