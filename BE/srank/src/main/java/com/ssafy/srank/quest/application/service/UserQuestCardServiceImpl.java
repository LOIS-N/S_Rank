package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import com.ssafy.srank.quest.domain.entity.UserMainQuestCard;
import com.ssafy.srank.quest.domain.entity.UserSubQuest;
import com.ssafy.srank.quest.domain.entity.UserSubQuestCard;
import com.ssafy.srank.quest.repository.UserMainQuestCardRepository;
import com.ssafy.srank.quest.repository.UserSubQuestCardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserQuestCardServiceImpl implements UserQuestCardService{

    private final UserMainQuestCardRepository userMainRepository;
    private final UserSubQuestCardRepository userSubRepository;

    @Override
    public void validateCardsAvailable(Long userId, List<Long> cardIds) {
        if(!userMainRepository.findByUserCardIdInAndUserId(cardIds, userId).isEmpty()
                || !userSubRepository.findByUserCardIdInAndUserId(cardIds, userId).isEmpty()) throw new BusinessException(ErrorCode.CARD_ALREADY_IN_USE);
    }

    @Override
    public void saveMainQuestCards(UserMainQuest mainQuest, List<Long> cardIds) {
        List<UserMainQuestCard> list = cardIds.stream()
                .map((cardId) -> {
                    return UserMainQuestCard.builder()
                            .userMainQuest(mainQuest)
                            .userId(mainQuest.getUserId())
                            .userCardId(cardId)
                            .build();
                }).toList();

        userMainRepository.saveAll(list);
    }

    @Override
    public void saveSubQuestCards(UserSubQuest subQuest, List<Long> cardIds) {
        List<UserSubQuestCard> list = cardIds.stream()
                .map((cardId) -> {
                    return UserSubQuestCard.builder()
                            .userSubQuest(subQuest)
                            .userId(subQuest.getUserId())
                            .userCardId(cardId)
                            .build();
                }).toList();

        userSubRepository.saveAll(list);
    }

    @Override
    public void deleteMainQuestCard(Long userId, Long questId) {
        userMainRepository.deleteByUserIdAndUserMainQuest_Id(userId, questId);
    }

    @Override
    public void deleteSubQuestCard(Long userId, Long questId) {
        userSubRepository.deleteByUserIdAndUserSubQuest_Id(userId, questId);
    }

    @Override
    public List<Long> getUsedCardList(Long userId) {

        List<UserMainQuestCard> main = userMainRepository.findByUserId(userId);
        List<UserSubQuestCard> sub = userSubRepository.findByUserId(userId);

        List<Long> result = new ArrayList<>(main.stream().map(UserMainQuestCard::getUserCardId).toList());
        result.addAll(sub.stream().map(UserSubQuestCard::getUserCardId).toList());

        return result;
    }
}
