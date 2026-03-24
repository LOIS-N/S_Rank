package com.ssafy.srank.gacha.domain.policy;

/**
 * 구버전 서버 RNG 추상화다.
 * 현재 요청 경로에서는 Provably Fair 계산기로 대체되었으므로 보존만 하고 사용하지 않는다.
 */
@Deprecated(forRemoval = false)
public interface GachaRandomProvider {

    // 확률표에서 grade를 고를 때 쓰는 부동소수 롤
    double nextDouble();

    // 리스트 후보 중 하나를 고를 때 쓰는 정수 롤
    int nextInt(int bound);
}
