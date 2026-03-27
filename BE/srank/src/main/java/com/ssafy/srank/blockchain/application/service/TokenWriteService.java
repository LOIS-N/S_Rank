package com.ssafy.srank.blockchain.application.service;

import com.ssafy.srank.blockchain.contracts.GameToken;
import com.ssafy.srank.common.metrics.BlockchainMetrics;
import java.math.BigInteger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

//@Service
@RequiredArgsConstructor
@Slf4j
public class TokenWriteService {

    private final GameToken gameToken;
    private final BlockchainMetrics metrics;

    /**
     * 업적/보상 지급용 토큰 민팅
     * @return txHash
     */
    public String mintReward(String toWallet, BigInteger amount) {
        long start = System.nanoTime();

        try {
            TransactionReceipt receipt = gameToken.mintReward(toWallet, amount).send();

            metrics.recordWrite(
                    System.nanoTime() - start,
                    "TOKEN_MINT_REWARD",
                    "1",
                    "SUCCESS",
                    "NONE"
            );

            return receipt.getTransactionHash();

        } catch (Exception e) {
            metrics.recordWrite(
                    System.nanoTime() - start,
                    "TOKEN_MINT_REWARD",
                    "1",
                    "FAIL",
                    e.getClass().getSimpleName()
            );

            throw new RuntimeException("토큰 보상 지급 실패", e);
        }
    }

    /**
     * P2P 거래 시 토큰 이동
     * @return txHash
     */
    public String transfer(String fromWallet, String toWallet, BigInteger amount) {
        long start = System.nanoTime();

        try {
            TransactionReceipt receipt = gameToken.transferFrom(
                    fromWallet,
                    toWallet,
                    amount
            ).send();

            metrics.recordWrite(
                    System.nanoTime() - start,
                    "TOKEN_TRANSFER",
                    "1",
                    "SUCCESS",
                    "NONE"
            );

            return receipt.getTransactionHash();

        } catch (Exception e) {
            metrics.recordWrite(
                    System.nanoTime() - start,
                    "TOKEN_TRANSFER",
                    "1",
                    "FAIL",
                    e.getClass().getSimpleName()
            );

            throw new RuntimeException("토큰 전송 실패", e);
        }
    }
}