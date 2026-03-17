package com.ssafy.srank.gacha.domain.policy;

public interface GachaRandomProvider {

    double nextDouble();

    int nextInt(int bound);
}
