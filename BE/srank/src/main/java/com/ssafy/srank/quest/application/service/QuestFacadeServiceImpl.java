package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.card.application.service.UserCardService;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.metrics.BusinessExceptionMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.QuestMetrics;
import com.ssafy.srank.desk.application.service.DeskService;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.quest.application.dto.request.CompleteQuestRequest;
import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.QuestDateTimeRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.domain.entity.QuestType;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import com.ssafy.srank.quest.domain.entity.UserSubQuest;
import com.ssafy.srank.rabbitmq.log.message.QuestMessage;
import com.ssafy.srank.rabbitmq.log.producer.QuestLogProducer;
import com.ssafy.srank.sse.application.event.QuestCompletedEvent;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestFacadeServiceImpl implements QuestFacadeService {

    private final StringRedisTemplate redisTemplate;
    private final ApplicationEventPublisher eventPublisher;
    private final QuestLogProducer producer;
    private final MainQuestService mainService;
    private final SubQuestService subService;
    private final UserQuestCardService questCardService;
    private final UserCardService userCardService;
    private final DeskService deskService;
    private final UserService userService;
    private final QuestMetrics questMetrics;
    private final BusinessExceptionMetrics businessExceptionMetrics;

    @Transactional
    @Override
    public List<InProcessQuestResponse> getInProcessQuestList(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        List<InProcessQuestResponse> list = new ArrayList<>(mainService.getUserMainQuestList(userId, now));
        list.addAll(subService.getUserSubQuestList(userId, now));
        return list;
    }

    @Transactional
    @Override
    public Long startMainQuest(Long userId, Long questTemplateId, MainQuestRequest request) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            validateCardCount(request.cardIds());
            validateCards(userId, request.cardIds());
            validateDeskUnlocked(userId, request.deskId());

            LocalDateTime startAt = LocalDateTime.now();
            LocalDateTime endAt = startAt.plusSeconds(request.duration());
            UserMainQuest mainQuest = mainService.startMainQuest(
                    userId,
                    questTemplateId,
                    request,
                    QuestDateTimeRequest.builder().startAt(startAt).endAt(endAt).build()
            );

            questCardService.saveMainQuestCards(mainQuest, request.cardIds());
            String key = "quest:%d:%d:%s".formatted(userId, mainQuest.getId(), "main");
            redisTemplate.opsForValue().set(key, "1", request.duration(), TimeUnit.SECONDS);

            producer.sendQuestLogMessage(new QuestMessage(
                    userId,
                    "MAIN",
                    questTemplateId,
                    null,
                    request.duration(),
                    "START",
                    startAt
            ));
            return mainQuest.getId();
        } catch (BusinessException e) {
            result = MetricTagValues.RESULT_FAILURE;
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record("quest.start_main", e);
            throw e;
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            questMetrics.recordStart(System.nanoTime() - startNanos, "main", result, errorCode);
        }
    }

    @Transactional
    @Override
    public Long startSubQuest(Long userId, Long questTemplateId, SubQuestRequest request) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            validateCardCount(request.cardIds());
            validateCards(userId, request.cardIds());
            validateDeskUnlocked(userId, request.deskId());

            LocalDateTime startAt = LocalDateTime.now();
            LocalDateTime endAt = startAt.plusSeconds(request.duration());
            UserSubQuest subQuest = subService.startSubQuest(
                    userId,
                    questTemplateId,
                    request,
                    QuestDateTimeRequest.builder().startAt(startAt).endAt(endAt).build()
            );

            questCardService.saveSubQuestCards(subQuest, request.cardIds());
            String key = "quest:%d:%d:%s".formatted(userId, subQuest.getId(), "sub");
            redisTemplate.opsForValue().set(key, "1", request.duration(), TimeUnit.SECONDS);

            producer.sendQuestLogMessage(new QuestMessage(
                    userId,
                    "SUB",
                    questTemplateId,
                    null,
                    request.duration(),
                    "START",
                    startAt
            ));
            return subQuest.getId();
        } catch (BusinessException e) {
            result = MetricTagValues.RESULT_FAILURE;
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record("quest.start_sub", e);
            throw e;
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            questMetrics.recordStart(System.nanoTime() - startNanos, "sub", result, errorCode);
        }
    }

    @Transactional
    @Override
    public void claimReward(Long userId, CompleteQuestRequest request) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;
        String questType = MetricTagValues.text(request.questType().name());

        try {
            long gold;
            if (request.questType().equals(QuestType.MAIN)) {
                gold = mainService.claimRewardMainQuest(userId, request.questId());
            } else {
                gold = subService.claimRewardSubQuest(userId, request.questId());
            }
            userService.rewardGold(userId, gold, GoldLogReason.QUEST_REWARD);

            producer.sendQuestLogMessage(new QuestMessage(
                    userId,
                    request.questType().toString(),
                    null,
                    request.questId(),
                    null,
                    "REWARD",
                    LocalDateTime.now()
            ));
        } catch (BusinessException e) {
            result = MetricTagValues.RESULT_FAILURE;
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record("quest.claim_reward", e);
            throw e;
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            questMetrics.recordRewardClaim(System.nanoTime() - startNanos, questType, result, errorCode);
        }
    }

    @Transactional
    @Override
    public void completeQuest(Long userId, Long questId, String type) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;
        String questType = MetricTagValues.text(type);

        try {
            if (QuestType.valueOf(type.toUpperCase()) == QuestType.MAIN) {
                mainService.completeMainQuest(userId, questId);
                questCardService.deleteMainQuestCard(userId, questId);
            } else {
                subService.completeSubQuest(userId, questId);
                questCardService.deleteSubQuestCard(userId, questId);
            }

            eventPublisher.publishEvent(new QuestCompletedEvent(
                    userId,
                    questId,
                    type,
                    "?섏뒪?멸? ?꾨즺?섏뿀?듬땲??"
            ));

            producer.sendQuestLogMessage(new QuestMessage(
                    userId,
                    type.toUpperCase(),
                    null,
                    questId,
                    null,
                    "COMPLETE",
                    LocalDateTime.now()
            ));
        } catch (BusinessException e) {
            result = MetricTagValues.RESULT_FAILURE;
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record("quest.complete", e);
            throw e;
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            questMetrics.recordComplete(System.nanoTime() - startNanos, questType, result, errorCode);
        }
    }

    @Override
    public List<Long> getUsedUserCardList(Long userId) {
        return questCardService.getUsedCardList(userId);
    }

    private void validateCardCount(List<Long> cardIds) {
        if (cardIds.size() < 3 || cardIds.size() > 5) {
            throw new BusinessException(ErrorCode.QUEST_CARD_COUNT_INVALID);
        }
    }

    private void validateCards(Long userId, List<Long> cardIds) {
        userCardService.validateCardsOwned(userId, cardIds);
        questCardService.validateCardsAvailable(userId, cardIds);
    }

    private void validateDeskUnlocked(Long userId, Long deskId) {
        deskService.validateDeskUnlocked(userId, deskId);
    }
}
