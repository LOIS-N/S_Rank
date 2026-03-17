package com.ssafy.srank.auth.application.service;

public record PrivyIdentity(
        String privyId,
        String email,
        String walletAddress
) {
}
