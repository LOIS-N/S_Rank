package com.ssafy.srank.auth.application.service;

import com.ssafy.srank.user.domain.entity.User;

public interface WalletProvider {

    String createWallet(User user);
}
