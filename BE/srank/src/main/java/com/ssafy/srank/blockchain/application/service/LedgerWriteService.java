package com.ssafy.srank.blockchain.application.service;

import com.ssafy.srank.blockchain.contracts.Ledger;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import lombok.RequiredArgsConstructor;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

import java.math.BigInteger;
import java.util.List;

@RequiredArgsConstructor
public class LedgerWriteService {

    private final Ledger ledger;

    public String recordGacha(
            String walletAddress,
            String serverSeed,
            String clientSeed,
            int count,
            GachaType gachaType
    ) throws Exception {
        TransactionReceipt receipt = ledger.recordGacha(
                walletAddress,
                serverSeed,
                clientSeed,
                BigInteger.valueOf(count),
                gachaType.name()
        ).send();
        return receipt.getTransactionHash();
    }

    public String recordSynthesis(
            String walletAddress,
            List<Long> consumedCardIds
    ) throws Exception {
        TransactionReceipt receipt = ledger.recordSynthesis(
                walletAddress,
                consumedCardIds.stream()
                        .map(BigInteger::valueOf)
                        .toList()
        ).send();
        return receipt.getTransactionHash();
    }
}
