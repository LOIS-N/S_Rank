package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import com.ssafy.srank.quest.domain.entity.UserSubQuest;

import java.util.List;

public interface UserQuestCardService {
    // 사용 가능 여부 검증
    void validateCardsAvailable(Long userId, List<Long> cardIds);

    // 메인 퀘스트 사용 카드 저장
    void saveMainQuestCards(UserMainQuest mainQuest, List<Long> cardIds);

    // 서브 퀘스트 사용 카드 저장
    void saveSubQuestCards(UserSubQuest subQuest, List<Long> cardIds);

    // 메인 퀘스트 사용 카드 삭제
    void deleteMainQuestCard(Long userId, Long questId);

    // 서브 퀘스트 사용 카드 삭제
    void deleteSubQuestCard(Long userId, Long questId);

    //사용 카드 조회
    List<Long> getUsedCardList(Long userId);
}
