package com.ssafy.srank.gacha.domain.policy;

public interface GachaRandomProvider {

    // 확률표에서 grade를 고를 때 쓰는 부동소수 롤
    double nextDouble();

    // 리스트 후보 중 하나를 고를 때 쓰는 정수 롤
    int nextInt(int bound);
}
