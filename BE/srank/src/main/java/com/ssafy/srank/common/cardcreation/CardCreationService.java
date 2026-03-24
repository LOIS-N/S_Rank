package com.ssafy.srank.common.cardcreation;

public interface CardCreationService {

    /**
     * 확정된 등급 기준으로 카드 초안과 생성 메타데이터를 함께 만든다.
     */
    CreatedCardDraft create(CardCreationCommand command, CardCreationRandomSource randomSource);
}
