package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.EffectOperator;
import com.ssafy.srank.card.domain.enums.EffectType;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.mission.application.service.MissionService;
import com.ssafy.srank.mission.domain.enums.MissionCategory;
import com.ssafy.srank.quest.application.dto.request.QuestDateTimeRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.application.dto.response.SubQuestResponse;
import com.ssafy.srank.quest.domain.entity.*;
import com.ssafy.srank.quest.repository.SubQuestTemplateRepository;
import com.ssafy.srank.quest.repository.UserSubQuestCardRepository;
import com.ssafy.srank.quest.repository.UserSubQuestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class SubQuestServiceImpl implements SubQuestService {

    private final SubQuestTemplateRepository subQuestTemplateRepository;
    private final UserSubQuestRepository userSubQuestRepository;
    private final UserSubQuestCardRepository userSubQuestCardRepository;
    private final UserCardRepository userCardRepository;
    private final MissionService missionService;

    /** 퀘스트에 배정된 카드들의 완벽주의자(QUEST_REWARD_GOLD PERCENT) 보너스 합산 → multiplier(100 기준) 반환 */
    private int calcRewardMultiplier(Long userId, Long questId) {
        List<UserSubQuestCard> questCards = userSubQuestCardRepository
                .findByUserIdAndUserSubQuest_Id(userId, questId);
        if (questCards.isEmpty()) return 100;

        List<Long> cardIds = questCards.stream().map(UserSubQuestCard::getUserCardId).toList();
        List<UserCard> cards = userCardRepository.findAllActiveByUserIdAndIdIn(userId, cardIds);

        int bonus = 0;
        for (UserCard card : cards) {
            if (card.getSpecialSkillTemplate() == null) continue;
            for (var effect : card.getSpecialSkillTemplate().getEffects()) {
                if (effect.getEffectType() == EffectType.QUEST_REWARD_GOLD
                        && effect.getEffectOperator() == EffectOperator.PERCENT
                        && effect.getEffectAmount() != null) {
                    bonus += effect.getEffectAmount();
                }
            }
        }
        return 100 + bonus;
    }

    @Override
    public List<InProcessQuestResponse> getUserSubQuestList(Long userId, LocalDateTime now) {
        List<UserSubQuest> quests = userSubQuestRepository.findByUserId(userId);
        if (quests.isEmpty()) return List.of();

        // 퀘스트별 카드 한 번에 조회
        List<UserSubQuestCard> allCards = userSubQuestCardRepository
                .findByUserIdAndUserSubQuestIn(userId, quests);
        List<Long> allCardIds = allCards.stream().map(UserSubQuestCard::getUserCardId).distinct().toList();
        List<UserCard> userCards = userCardRepository.findAllActiveByUserIdAndIdIn(userId, allCardIds);
        Map<Long, UserCard> cardMap = userCards.stream()
                .collect(Collectors.toMap(UserCard::getId, c -> c));

        // 퀘스트 ID → multiplier 맵
        Map<Long, Integer> multiplierMap = quests.stream().collect(Collectors.toMap(
                UserSubQuest::getId,
                quest -> {
                    int bonus = allCards.stream()
                            .filter(qc -> qc.getUserSubQuest().getId().equals(quest.getId()))
                            .mapToInt(qc -> {
                                UserCard card = cardMap.get(qc.getUserCardId());
                                if (card == null || card.getSpecialSkillTemplate() == null) return 0;
                                return card.getSpecialSkillTemplate().getEffects().stream()
                                        .filter(e -> e.getEffectType() == EffectType.QUEST_REWARD_GOLD
                                                && e.getEffectOperator() == EffectOperator.PERCENT
                                                && e.getEffectAmount() != null)
                                        .mapToInt(e -> e.getEffectAmount())
                                        .sum();
                            }).sum();
                    return 100 + bonus;
                }
        ));

        return quests.stream().map((quest) -> {
            Long second = quest.getStatus() == QuestStatus.COMPLETED
                    ? 0 : Duration.between(now, quest.getEndAt()).getSeconds();
            int multiplier = multiplierMap.getOrDefault(quest.getId(), 100);
            return InProcessQuestResponse.fromUserSubQuest(quest, second, multiplier);
        }).toList();
    }


    @Override
    public UserSubQuest startSubQuest(Long userId, Long questTemplateId, SubQuestRequest request, QuestDateTimeRequest date) {
        // 사용자 서브 퀘스트 저장
        UserSubQuest subQuest = UserSubQuest.builder()
                .userId(userId)
                .subQuestTemplate(SubQuestTemplate.builder().id(questTemplateId).build())
                .status(QuestStatus.IN_PROGRESS)
                .userDeskId(request.deskId())
                .startedAt(date.getStartAt())
                .endAt(date.getEndAt())
                .build();
        return userSubQuestRepository.save(subQuest);
    }

    @Override
    public void completeSubQuest(Long userId, Long questId) {
        UserSubQuest subQuest = userSubQuestRepository.findByIdAndUserIdAndStatus(questId, userId, QuestStatus.IN_PROGRESS)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_IN_PROGRESS));

        subQuest.completeStatus();
        missionService.recordActivity(userId, MissionCategory.QUEST, 1);
    }

    @Override
    public Long claimRewardSubQuest(Long userId, Long questId) {
        UserSubQuest subQuest = userSubQuestRepository.findByIdAndUserIdAndStatus(questId, userId, QuestStatus.COMPLETED)
                .orElseThrow(()-> new BusinessException(ErrorCode.QUEST_NOT_COMPLETED));
        int multiplier = calcRewardMultiplier(userId, questId);
        userSubQuestRepository.delete(subQuest);
        long baseReward = subQuest.getSubQuestTemplate().getRewardGold();
        return Math.round(baseReward * multiplier / 100.0);
    }

    public List<SubQuestResponse> getSubQuests(Long userId) {
        LocalDate today = LocalDate.now();

        List<SubQuestTemplate> templates = subQuestTemplateRepository.findTodaySubQuests(today);

        List<Long> templateIds = templates.stream().map(SubQuestTemplate::getId).toList();

        Map<Long, String> statusMap = userSubQuestRepository
                .findByUserIdAndTemplateIds(userId, templateIds)
                .stream()
                .collect(Collectors.toMap(
                        uq -> uq.getSubQuestTemplate().getId(),
                        uq -> uq.getStatus().name(),
                        (existing, replacement) -> existing
                ));

        return templates.stream()
                .map(template -> SubQuestResponse.from(template, statusMap.get(template.getId())))
                .toList();
    }

    /*
    *   서브퀘스트 템플릿 ID
    * */
    @Override
    public QuestDetailResponse getSubQuestDetail(Long userId, Long questId) {
        SubQuestTemplate template = subQuestTemplateRepository.findById(questId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));
        String status = userSubQuestRepository
                .findByUserIdAndTemplateId(userId, questId)
                .map(uq -> uq.getStatus().name())
                .orElse(null);

        return QuestDetailResponse.fromSub(template, status);
    }

    @Override
    public QuestDetailResponse getUserSubQuestDetail(Long userId, Long questId) {
        return QuestDetailResponse.userDetailSub(userSubQuestRepository.findByIdAndUserId(questId, userId).orElseThrow(
                ()-> new BusinessException(ErrorCode.QUEST_NOT_FOUND)));
    }
}
