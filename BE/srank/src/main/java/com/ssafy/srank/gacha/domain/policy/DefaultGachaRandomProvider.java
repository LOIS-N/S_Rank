package com.ssafy.srank.gacha.domain.policy;

import org.springframework.stereotype.Component;

import java.util.concurrent.ThreadLocalRandom;

/**
 * 구버전 서버 RNG 구현체다.
 * 현재 요청 경로에서는 Provably Fair 계산기로 대체되었으므로 보존만 하고 사용하지 않는다.
 */
@Deprecated(forRemoval = false)
@Component
public class DefaultGachaRandomProvider implements GachaRandomProvider {

    @Override
    public double nextDouble() {
        // 등급 추첨처럼 0.0 이상 1.0 미만 확률 롤이 필요할 때 사용한다.
        return ThreadLocalRandom.current().nextDouble();
    }

    @Override
    public int nextInt(int bound) {
        // 템플릿/포지션 인덱스 선택처럼 정수 범위 추첨이 필요할 때 사용한다.
        return ThreadLocalRandom.current().nextInt(bound);
    }
}
