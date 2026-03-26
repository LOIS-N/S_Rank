package com.ssafy.srank.blockchain.application.service;

import com.ssafy.srank.blockchain.contracts.Ledger;
import com.ssafy.srank.common.metrics.BlockchainMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import lombok.RequiredArgsConstructor;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

import java.math.BigInteger;
import java.util.List;

@RequiredArgsConstructor
public class LedgerWriteService {

    private final Ledger ledger;
    private final BlockchainMetrics blockchainMetrics;

    public String recordGacha(
            String walletAddress,
            String serverSeed,
            String clientSeed,
            int count,
            GachaType gachaType,
            int attempt
    ) throws Exception {
        return recordWrite("gacha", attempt, () -> ledger.recordGacha(
                walletAddress,
                serverSeed,
                clientSeed,
                BigInteger.valueOf(count),
                gachaType.name()
        ).send());
    }

    public String recordSynthesis(
            String walletAddress,
            List<Long> consumedCardIds,
            int attempt
    ) throws Exception {
        return recordWrite("synthesis", attempt, () -> ledger.recordSynthesis(
                walletAddress,
                consumedCardIds.stream().map(BigInteger::valueOf).toList()
        ).send());
    }

    // 실제 체인 write는 여기 하나로 모아 timer/counter를 중복 없이 남긴다.
    private String recordWrite(String eventType, int attempt, ReceiptSupplier supplier) throws Exception {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            TransactionReceipt receipt = supplier.send();
            return receipt.getTransactionHash();
        } catch (Exception e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            blockchainMetrics.recordWrite(
                    System.nanoTime() - startNanos,
                    eventType,
                    MetricTagValues.number(attempt),
                    result,
                    errorCode
            );
        }
    }

    @FunctionalInterface
    private interface ReceiptSupplier {
        TransactionReceipt send() throws Exception;
    }

    public String recordEnhance(
            String walletAddress,
            String serverSeed,
            String clientSeed

    ) throws Exception {
        TransactionReceipt receipt = ledger.recordEnhancement(
                walletAddress,
                serverSeed,
                clientSeed
        ).send();
        return receipt.getTransactionHash();
    }
}
