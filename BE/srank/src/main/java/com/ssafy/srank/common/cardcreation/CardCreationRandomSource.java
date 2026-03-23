package com.ssafy.srank.common.cardcreation;

@FunctionalInterface
public interface CardCreationRandomSource {

    /**
     * 목적 문자열과 bound를 기준으로 deterministic 한 정수 롤을 반환한다.
     */
    int roll(String purpose, int bound);
}
