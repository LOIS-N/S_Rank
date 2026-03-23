package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.card.application.service.UserCardService;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.desk.application.service.DeskService;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.quest.application.dto.request.CompleteQuestRequest;
import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.QuestDateTimeRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.domain.entity.*;
import com.ssafy.srank.quest.repository.*;
import com.ssafy.srank.sse.application.event.QuestCompletedEvent;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestFacadeServiceImpl implements QuestFacadeService{

    private final StringRedisTemplate redisTemplate;
    private final ApplicationEventPublisher eventPublisher;

    private final MainQuestService mainService;
    private final SubQuestService subService;
    private final UserQuestCardService questCardService;
    private final UserCardService userCardService;
    private final DeskService deskService;
    private final UserService userService;

    @Transactional
    @Override
    public List<InProcessQuestResponse> getInProcessQuestList(Long userId) {
        log.debug("[Quest] 진행 중인 퀘스트 목록 조회 시작 - userId={}", userId);
        LocalDateTime now = LocalDateTime.now();
        //main
        List<InProcessQuestResponse> list = new ArrayList<>(mainService.getUserMainQuestList(userId, now));

        //sub
        list.addAll(subService.getUserSubQuestList(userId, now));

        return list;
    }

    @Transactional
    @Override
    public void startMainQuest(Long userId, Long questTemplateId, MainQuestRequest request) {
        //Start 검증
        validateCardCount(request.cardIds()); //카드 수
        validateCards(userId, request.cardIds()); //보유 카드
        validateDeskUnlocked(userId, request.deskId());//해금된 책상

        //종료 시간 계산
        LocalDateTime startAt = LocalDateTime.now();
        LocalDateTime endAt = startAt.plusSeconds(request.duration());

        //퀘스트 저장
        UserMainQuest mainQuest = mainService.startMainQuest(
                userId,questTemplateId,request,
                QuestDateTimeRequest.builder().startAt(startAt).endAt(endAt).build());

        //카드 저장
        questCardService.saveMainQuestCards(mainQuest, request.cardIds());

        //레디스 TTL 저장
        String key = "quest:%d:%d:%s".formatted(userId, mainQuest.getId(), "main");
        redisTemplate.opsForValue().set(key,"1", request.duration(), TimeUnit.SECONDS);
    }

    @Transactional
    @Override
    public void startSubQuest(Long userId, Long questTemplateId, SubQuestRequest request) {
        //Start 검증
        validateCardCount(request.cardIds()); //카드 수
        validateCards(userId, request.cardIds()); //보유 카드
        validateDeskUnlocked(userId, request.deskId());//해금된 책상

        //종료 시간 계산
        LocalDateTime startAt = LocalDateTime.now();
        LocalDateTime endAt = startAt.plusSeconds(request.duration());

        //퀘스트 저장
        UserSubQuest subQuest = subService.startSubQuest(
                userId,questTemplateId,request,
                QuestDateTimeRequest.builder().startAt(startAt).endAt(endAt).build());

        //카드 저장
        questCardService.saveSubQuestCards(subQuest, request.cardIds());

        //레디스 TTL 저장
        String key = "quest:%d:%d:%s".formatted(userId, subQuest.getId(), "sub");
        redisTemplate.opsForValue().set(key,"1",request.duration(), TimeUnit.SECONDS);
    }

    @Transactional
    @Override
    public void claimReward(Long userId, CompleteQuestRequest request) {
        long gold;

        if(request.questType().equals(QuestType.MAIN)){
            gold = mainService.claimRewardMainQuest(userId, request.questId());
        }else{
            gold = subService.claimRewardSubQuest(userId, request.questId());
        }
        userService.rewardGold(userId, gold, GoldLogReason.QUEST_REWARD);
    }

    @Transactional
    @Override
    public void completeQuest(Long userId, Long questId, String type) {
        if(QuestType.valueOf(type.toUpperCase()) == QuestType.MAIN){
            //진행중인 메인 퀘스트 상태 변경 (진행중->완료)
            mainService.completeMainQuest(userId, questId);
            //카드
            questCardService.deleteMainQuestCard(userId, questId);
        }else{
            subService.completeSubQuest(userId, questId);
            questCardService.deleteSubQuestCard(userId, questId);
        }

        //이벤트 발행
        eventPublisher.publishEvent(
                new QuestCompletedEvent(
                        userId,
                        questId,
                        type,
                        "퀘스트가 완료되었습니다."
                )
        );
    }

    public List<Long> getUsedUserCardList(Long userId){
        return questCardService.getUsedCardList(userId);
    }


    // ============ 검증 메소드들 ============

    /**
     * 카드 개수 검증 (3~5장)
     */
    private void validateCardCount(List<Long> cardIds) {
        if (cardIds.size() < 3 || cardIds.size() > 5) {
            throw new BusinessException(ErrorCode.QUEST_CARD_COUNT_INVALID);
        }
    }

    /**
     * 사용 가능 카드 검증
     */
    private void validateCards(Long userId, List<Long> cardIds) {
        userCardService.validateCardsOwned(userId, cardIds);
        questCardService.validateCardsAvailable(userId, cardIds);
    }

    /**
     * 책상이 해금되었는지 확인
     */
    private void validateDeskUnlocked(Long userId, Long deskId) {
        deskService.validateDeskUnlocked(userId, deskId);
    }

}
