package com.ssafy.srank.blockchain.application.dto;

import java.math.BigInteger;

public record NftMintResult(
        String txHash,
        BigInteger tokenId
) {
}