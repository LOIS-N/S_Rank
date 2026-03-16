package com.ssafy.srank.auth.application.service;

import com.ssafy.srank.user.domain.entity.User;
import org.springframework.stereotype.Component;

@Component
public class NoopWalletProvider implements WalletProvider {

    @Override
    public String createWallet(User user) {
        return null;
    }
}
