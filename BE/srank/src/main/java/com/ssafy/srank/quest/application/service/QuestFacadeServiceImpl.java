package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.card.domain.entity.SpecialSkillEffect;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.desk.repository.UserDeskRepository;
import com.ssafy.srank.log.application.command.GoldLogCommand;
import com.ssafy.srank.log.application.command.QuestCardLogCommand;
import com.ssafy.srank.log.application.command.QuestEventLogCommand;
import com.ssafy.srank.log.application.command.QuestStartLogCommand;
import com.ssafy.srank.log.application.facade.EconomyLogFacade;
import com.ssafy.srank.log.application.facade.QuestLogFacade;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.log.domain.enums.QuestLogStatus;
import com.ssafy.srank.quest.application.dto.request.CompleteQuestRequest;
import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.domain.entity.MainQuestTemplate;
import com.ssafy.srank.quest.domain.entity.QuestStatus;
import com.ssafy.srank.quest.domain.entity.QuestType;
import com.ssafy.srank.quest.domain.entity.SubQuestTemplate;
import com.ssafy.srank.quest.domain.entity.UserDeskQuest;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import com.ssafy.srank.quest.domain.entity.UserMainQuestCard;
import com.ssafy.srank.quest.domain.entity.UserSubQuest;
import com.ssafy.srank.quest.domain.entity.UserSubQuestCard;
import com.ssafy.srank.quest.repository.MainQuestTemplateRepository;
import com.ssafy.srank.quest.repository.SubQuestTemplateRepository;
import com.ssafy.srank.quest.repository.UserDeskQuestRepository;
import com.ssafy.srank.quest.repository.UserMainQuestCardRepository;
import com.ssafy.srank.quest.repository.UserMainQuestRepository;
import com.ssafy.srank.quest.repository.UserSubQuestCardRepository;
import com.ssafy.srank.quest.repository.UserSubQuestRepository;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestFacadeServiceImpl implements QuestFacadeService {

    private final MainQuestService mainService;
    private final SubQuestService subService;
    private final UserDeskQuestRepository deskQuestRepository;
    private final UserMainQuestRepository userMainQuestRepository;
    private final UserMainQuestCardRepository userMainQuestCardRepository;
    private final UserSubQuestRepository userSubQuestRepository;
    private final UserSubQuestCardRepository userSubQuestCardRepository;
    private final UserService userService;
    private final QuestLogFacade questLogFacade;
    private final EconomyLogFacade economyLogFacade;
    private final MainQuestTemplateRepository mainQuestTemplateRepository;
    private final SubQuestTemplateRepository subQuestTemplateRepository;
    private final UserCardRepository userCardRepository;
    private final UserDeskRepository userDeskRepository;

    @Transactional
    @Override
    public List<InProcessQuestResponse> getInProcessQuestList(Long userId) {
        List<UserDeskQuest> questRefs = deskQuestRepository.findByUserId(userId);
        List<InProcessQuestResponse> list = questRefs.stream().map((questRef) -> {
            if (questRef.getQuestType().equals(QuestType.MAIN)) {
                return InProcessQuestResponse.from(questRef, mainService.getUserMainQuestDetail(userId, questRef.getQuestId()));
            }
            return InProcessQuestResponse.from(questRef, subService.getUserSubQuestDetail(userId, questRef.getQuestId()));
        }).toList();

        log.warn("list : {}", list);
        return list;
    }

    @Transactional
    @Override
    public void startMainQuest(Long userId, Long questId, MainQuestRequest request) {
        MainQuestTemplate template = mainQuestTemplateRepository.findById(questId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));

        validateCardCount(request.cardIds());
        List<UserCard> selectedCards = validateMainQuestCards(userId, request.cardIds(), template);
        validateDuration(request.startAt(), request.endAt(), template.getDurationMinutes());
        validateDeskUnlocked(userId, request.deskId());

        UserMainQuest savedQuest = userMainQuestRepository.save(UserMainQuest.builder()
                .userId(userId)
                .mainQuestTemplate(MainQuestTemplate.builder().id(questId).build())
                .status(QuestStatus.IN_PROGRESS)
                .startedAt(request.startAt())
                .endAt(request.endAt())
                .build());

        userMainQuestCardRepository.saveAll(request.cardIds().stream()
                .map(cardId -> UserMainQuestCard.builder()
                        .userMainQuest(savedQuest)
                        .userId(userId)
                        .userCardId(cardId)
                        .build())
                .toList());

        LocalDateTime now = LocalDateTime.now();
        QuestStartLogCommand logCommand = new QuestStartLogCommand(
                userId,
                questId,
                request.startAt(),
                now,
                toQuestCardLogCommands(selectedCards)
        );
        questLogFacade.recordMainQuestStarted(logCommand);
        questLogFacade.recordMainQuestCards(logCommand);

        deskQuestRepository.save(UserDeskQuest.builder()
                .userId(userId)
                .userDeskId(request.deskId())
                .questType(QuestType.MAIN)
                .questId(savedQuest.getId())
                .build());
    }

    @Transactional
    @Override
    public void startSubQuest(Long userId, Long questId, SubQuestRequest request) {
        SubQuestTemplate template = subQuestTemplateRepository.findById(questId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));

        validateCardCount(request.cardIds());
        List<UserCard> selectedCards = validateSubQuestCards(userId, request.cardIds(), template);
        validateDuration(request.startAt(), request.endAt(), template.getDurationMinutes());
        validateDeskUnlocked(userId, request.deskId());

        UserSubQuest savedQuest = userSubQuestRepository.save(UserSubQuest.builder()
                .userId(userId)
                .subQuestTemplate(SubQuestTemplate.builder().id(questId).build())
                .status(QuestStatus.IN_PROGRESS)
                .startedAt(request.startAt())
                .endAt(request.endAt())
                .build());

        userSubQuestCardRepository.saveAll(request.cardIds().stream()
                .map(cardId -> UserSubQuestCard.builder()
                        .userSubQuest(savedQuest)
                        .userId(userId)
                        .userCardId(cardId)
                        .build())
                .toList());

        LocalDateTime now = LocalDateTime.now();
        QuestStartLogCommand logCommand = new QuestStartLogCommand(
                userId,
                questId,
                request.startAt(),
                now,
                toQuestCardLogCommands(selectedCards)
        );
        questLogFacade.recordSubQuestStarted(logCommand);
        questLogFacade.recordSubQuestCards(logCommand);

        deskQuestRepository.save(UserDeskQuest.builder()
                .userId(userId)
                .userDeskId(request.deskId())
                .questType(QuestType.SUB)
                .questId(savedQuest.getId())
                .build());
    }

    @Transactional
    @Override
    public void completeQuest(Long userId, CompleteQuestRequest request) {
        if (request.questType().equals(QuestType.MAIN)) {
            completeMainQuest(userId, request.questId());
            return;
        }
        completeSubQuest(userId, request.questId());
    }

    public Set<Long> getUsedUserCardList(Long userId) {
        List<InProcessQuestResponse> inProcessQuestList = getInProcessQuestList(userId);

        List<Long> mainCardIds = userMainQuestCardRepository.findByUserIdAndUserMainQuestIn(
                userId,
                inProcessQuestList.stream()
                        .map(q -> UserMainQuest.builder().id(q.getQuestId()).build())
                        .toList()
        ).stream().map(UserMainQuestCard::getUserCardId).toList();

        List<Long> subCardIds = userSubQuestCardRepository.findByUserIdAndUserSubQuestIn(
                userId,
                inProcessQuestList.stream()
                        .map(q -> UserSubQuest.builder().id(q.getQuestId()).build())
                        .toList()
        ).stream().map(UserSubQuestCard::getUserCardId).toList();

        Set<Long> result = new HashSet<>(mainCardIds);
        result.addAll(subCardIds);
        return result;
    }

    private void completeMainQuest(Long userId, Long questId) {
        UserMainQuest mainQuest = userMainQuestRepository.findByIdAndUserIdAndStatus(questId, userId, QuestStatus.IN_PROGRESS)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_IN_PROGRESS));
        LocalDateTime completedAt = LocalDateTime.now();
        if (mainQuest.getEndAt().isAfter(completedAt)) {
            throw new BusinessException(ErrorCode.QUEST_NOT_IN_PROGRESS);
        }

        int actualDurationMinutes = Math.toIntExact(ChronoUnit.MINUTES.between(mainQuest.getStartedAt(), completedAt));
        long rewardGold = mainQuest.getMainQuestTemplate().getRewardGold();
        Long templateId = mainQuest.getMainQuestTemplate().getId();
        LocalDateTime startedAt = mainQuest.getStartedAt();

        userMainQuestCardRepository.deleteByUserIdAndUserMainQuest_Id(userId, questId);
        userMainQuestRepository.delete(mainQuest);
        deskQuestRepository.deleteByUserIdAndQuestId(userId, questId);

        // Completed and claimed are appended as separate business events.
        questLogFacade.recordMainQuestCompleted(new QuestEventLogCommand(
                userId,
                templateId,
                startedAt,
                completedAt,
                null,
                actualDurationMinutes,
                QuestLogStatus.COMPLETED,
                completedAt
        ));

        long balanceAfter = userService.rewardGold(userId, rewardGold);
        LocalDateTime claimedAt = LocalDateTime.now();
        economyLogFacade.recordGoldChange(new GoldLogCommand(
                userId,
                rewardGold,
                balanceAfter,
                GoldLogReason.QUEST_REWARD,
                claimedAt
        ));
        questLogFacade.recordMainQuestClaimed(new QuestEventLogCommand(
                userId,
                templateId,
                startedAt,
                completedAt,
                claimedAt,
                actualDurationMinutes,
                QuestLogStatus.CLAIMED,
                claimedAt
        ));
    }

    private void completeSubQuest(Long userId, Long questId) {
        UserSubQuest subQuest = userSubQuestRepository.findByIdAndUserIdAndStatus(questId, userId, QuestStatus.IN_PROGRESS)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_IN_PROGRESS));
        LocalDateTime completedAt = LocalDateTime.now();
        if (subQuest.getEndAt().isAfter(completedAt)) {
            throw new BusinessException(ErrorCode.QUEST_NOT_IN_PROGRESS);
        }

        int actualDurationMinutes = Math.toIntExact(ChronoUnit.MINUTES.between(subQuest.getStartedAt(), completedAt));
        long rewardGold = subQuest.getSubQuestTemplate().getRewardGold();
        Long templateId = subQuest.getSubQuestTemplate().getId();
        LocalDateTime startedAt = subQuest.getStartedAt();

        userSubQuestCardRepository.deleteByUserIdAndUserSubQuest_Id(userId, questId);
        userSubQuestRepository.delete(subQuest);
        deskQuestRepository.deleteByUserIdAndQuestId(userId, questId);

        questLogFacade.recordSubQuestCompleted(new QuestEventLogCommand(
                userId,
                templateId,
                startedAt,
                completedAt,
                null,
                actualDurationMinutes,
                QuestLogStatus.COMPLETED,
                completedAt
        ));

        long balanceAfter = userService.rewardGold(userId, rewardGold);
        LocalDateTime claimedAt = LocalDateTime.now();
        economyLogFacade.recordGoldChange(new GoldLogCommand(
                userId,
                rewardGold,
                balanceAfter,
                GoldLogReason.QUEST_REWARD,
                claimedAt
        ));
        questLogFacade.recordSubQuestClaimed(new QuestEventLogCommand(
                userId,
                templateId,
                startedAt,
                completedAt,
                claimedAt,
                actualDurationMinutes,
                QuestLogStatus.CLAIMED,
                claimedAt
        ));
    }

    private void validateCardCount(List<Long> cardIds) {
        if (cardIds.size() < 3 || cardIds.size() > 5) {
            throw new BusinessException(ErrorCode.QUEST_CARD_COUNT_INVALID);
        }
    }

    private List<UserCard> validateMainQuestCards(Long userId, List<Long> cardIds, MainQuestTemplate template) {
        return cardIds.stream()
                .map(cardId -> {
                    UserCard card = userCardRepository.findByIdAndUserId(cardId, userId)
                            .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND));
                    validateCardNotInUse(userId, cardId);
                    validateCardStats(card, template);
                    return card;
                })
                .toList();
    }

    private List<UserCard> validateSubQuestCards(Long userId, List<Long> cardIds, SubQuestTemplate template) {
        return cardIds.stream()
                .map(cardId -> {
                    UserCard card = userCardRepository.findByIdAndUserId(cardId, userId)
                            .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND));
                    validateCardNotInUse(userId, cardId);
                    validateCardStatsForSubQuest(card, template);
                    return card;
                })
                .toList();
    }

    private void validateCardNotInUse(Long userId, Long cardId) {
        boolean inMainQuest = userMainQuestCardRepository.existsByUserIdAndUserCardId(userId, cardId);
        boolean inSubQuest = userSubQuestCardRepository.existsByUserIdAndUserCardId(userId, cardId);

        if (inMainQuest || inSubQuest) {
            throw new BusinessException(ErrorCode.CARD_ALREADY_IN_USE);
        }
    }

    private void validateCardStats(UserCard card, MainQuestTemplate template) {
//        if (!hasMinimumStat(card, template.getRequiredSkillType1(), template.getRequiredSkillValue1())) {
//            throw new BusinessException(ErrorCode.QUEST_STAT_INSUFFICIENT);
//        }
//        if (!hasMinimumStat(card, template.getRequiredSkillType2(), template.getRequiredSkillValue2())) {
//            throw new BusinessException(ErrorCode.QUEST_STAT_INSUFFICIENT);
//        }
//        if (!hasMinimumStat(card, template.getRequiredSkillType3(), template.getRequiredSkillValue3())) {
//            throw new BusinessException(ErrorCode.QUEST_STAT_INSUFFICIENT);
//        }
    }

    private void validateCardStatsForSubQuest(UserCard card, SubQuestTemplate template) {
    }

    private boolean hasMinimumStat(UserCard card, String requiredSkillType, int requiredValue) {
        int minimumRequired = (int) Math.ceil(requiredValue * 0.5);
        int cardStatValue = getCardStatByType(card, requiredSkillType);
        return cardStatValue >= minimumRequired;
    }

    private int getCardStatByType(UserCard card, String skillType) {
        return switch (skillType.toUpperCase()) {
            case "BE" -> card.getStat1().getTotalValue();
            case "FE" -> card.getStat2().getTotalValue();
            case "DEVOPS" -> card.getStat3().getTotalValue();
            default -> 0;
        };
    }

    private void validateDuration(LocalDateTime startAt, LocalDateTime endAt, int templateDurationMinutes) {
        long actualDurationMinutes = ChronoUnit.MINUTES.between(startAt, endAt);
        if (actualDurationMinutes > templateDurationMinutes) {
            throw new BusinessException(ErrorCode.QUEST_EXCEED_HARD_CAP);
        }
    }

    private void validateDeskUnlocked(Long userId, Long deskId) {
        userDeskRepository.findByUserIdAndDeskTemplateId(userId, deskId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_SLOT_NOT_UNLOCKED));
    }

    private List<QuestCardLogCommand> toQuestCardLogCommands(List<UserCard> cards) {
        return cards.stream()
                .map(card -> new QuestCardLogCommand(
                        card.getId(),
                        card.getStat1().getSkillType().name(),
                        card.getStat1().getTotalValue(),
                        card.getStat2().getSkillType().name(),
                        card.getStat2().getTotalValue(),
                        card.getStat3().getSkillType().name(),
                        card.getStat3().getTotalValue(),
                        card.getSpecialSkillTemplate() == null ? null : card.getSpecialSkillTemplate().getSkillCode(),
                        extractSpecialSkillType(card),
                        extractSpecialSkillValue(card)
                ))
                .toList();
    }

    private String extractSpecialSkillType(UserCard card) {
        return firstSpecialSkillEffect(card)
                .map(effect -> effect.getEffectType().name())
                .orElse(null);
    }

    private Integer extractSpecialSkillValue(UserCard card) {
        return firstSpecialSkillEffect(card)
                .map(SpecialSkillEffect::getEffectAmount)
                .orElse(null);
    }

    private Optional<SpecialSkillEffect> firstSpecialSkillEffect(UserCard card) {
        if (card.getSpecialSkillTemplate() == null || card.getSpecialSkillTemplate().getEffects().isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(card.getSpecialSkillTemplate().getEffects().get(0));
    }
}
