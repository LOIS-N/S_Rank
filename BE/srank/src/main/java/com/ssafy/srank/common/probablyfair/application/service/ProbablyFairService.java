package com.ssafy.srank.common.probablyfair.application.service;

import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairPurpose;

public interface ProbablyFairService {

    /**
     * 요청 단위로 사용할 server seed와 알고리즘 버전을 발급한다.
     */
    ProbablyFairContext issueContext();

    /**
     * 같은 입력이면 항상 같은 값을 반환하는 공통 PF roll 진입점이다.
     */
    int roll(
            ProbablyFairContext context,
            String clientSeed,
            int drawIndex,
            ProbablyFairPurpose purpose,
            int bound
    );

    /**
     * 결과 digest나 proof 요약값을 만들 때 재사용하는 공통 해시 함수다.
     */
    String sha256Hex(String value);
}
