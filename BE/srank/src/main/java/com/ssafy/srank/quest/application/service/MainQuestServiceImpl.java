package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.EffectOperator;
import com.ssafy.srank.card.domain.enums.EffectType;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.mission.application.service.MissionService;
import com.ssafy.srank.mission.domain.enums.MissionCategory;
import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.QuestDateTimeRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.application.dto.response.MainQuestResponse;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.domain.entity.MainQuestTemplate;
import com.ssafy.srank.quest.domain.entity.QuestStatus;
import com.ssafy.srank.quest.domain.entity.UserMainQuest;
import com.ssafy.srank.quest.domain.entity.UserMainQuestCard;
import com.ssafy.srank.quest.repository.MainQuestTemplateRepository;
import com.ssafy.srank.quest.repository.UserMainQuestCardRepository;
import com.ssafy.srank.quest.repository.UserMainQuestRepository;
import com.ssafy.srank.user.application.dto.response.MyInfoResponse;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class MainQuestServiceImpl implements MainQuestService {

    private final MainQuestTemplateRepository mainQuestTemplateRepository;
    private final UserMainQuestRepository userMainQuestRepository;
    private final UserMainQuestCardRepository userMainQuestCardRepository;
    private final UserCardRepository userCardRepository;
    private final UserService userService;
    private final MissionService missionService;

    /** 퀘스트에 배정된 카드들의 완벽주의자(QUEST_REWARD_GOLD PERCENT) 보너스 합산 → multiplier(100 기준) 반환 */
    private int calcRewardMultiplier(Long userId, Long questId) {
        List<UserMainQuestCard> questCards = userMainQuestCardRepository
                .findByUserIdAndUserMainQuest_Id(userId, questId);
        if (questCards.isEmpty()) return 100;

        List<Long> cardIds = questCards.stream().map(UserMainQuestCard::getUserCardId).toList();
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
    public List<InProcessQuestResponse> getUserMainQuestList(Long userId, LocalDateTime now) {
        List<UserMainQuest> quests = userMainQuestRepository.findByUserIdAndStatusNot(userId, QuestStatus.CLAIMED);
        if (quests.isEmpty()) return List.of();

        // 퀘스트별 카드 한 번에 조회
        List<UserMainQuestCard> allCards = userMainQuestCardRepository
                .findByUserIdAndUserMainQuestIn(userId, quests);
        List<Long> allCardIds = allCards.stream().map(UserMainQuestCard::getUserCardId).distinct().toList();
        List<UserCard> userCards = userCardRepository.findAllActiveByUserIdAndIdIn(userId, allCardIds);
        Map<Long, UserCard> cardMap = userCards.stream()
                .collect(Collectors.toMap(UserCard::getId, c -> c));

        // 퀘스트 ID → multiplier 맵
        Map<Long, Integer> multiplierMap = quests.stream().collect(Collectors.toMap(
                UserMainQuest::getId,
                quest -> {
                    int bonus = allCards.stream()
                            .filter(qc -> qc.getUserMainQuest().getId().equals(quest.getId()))
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
            return InProcessQuestResponse.fromUserMainQuest(quest, second, multiplier);
        }).toList();
    }

    @Override
    public UserMainQuest startMainQuest(Long userId, Long questTemplateId, MainQuestRequest request, QuestDateTimeRequest date) {
        // 사용자 메인 퀘스트 저장
        UserMainQuest mainQuest = UserMainQuest.builder()
                .userId(userId)
                .mainQuestTemplate(MainQuestTemplate.builder().id(questTemplateId).build())
                .status(QuestStatus.IN_PROGRESS)
                .userDeskId(request.deskId())
                .startedAt(date.getStartAt())
                .endAt(date.getEndAt())
                .build();
        return userMainQuestRepository.save(mainQuest);
    }

    @Override
    public void completeMainQuest(Long userId, Long questId) {
        UserMainQuest mainQuest = userMainQuestRepository.findByIdAndUserIdAndStatus(questId, userId, QuestStatus.IN_PROGRESS)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_IN_PROGRESS));

        mainQuest.completeStatus();
        missionService.recordActivity(userId, MissionCategory.QUEST, 1);
    }

    @Override
    public Long claimRewardMainQuest(Long userId, Long questId) {
        UserMainQuest mainQuest = userMainQuestRepository.findByIdAndUserIdAndStatus(questId, userId, QuestStatus.COMPLETED)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_COMPLETED));
        mainQuest.claimRewardStatus();
        UserClearMainChapter(userId);
        int multiplier = calcRewardMultiplier(userId, questId);
        long baseReward = mainQuest.getMainQuestTemplate().getRewardGold();
        return Math.round(baseReward * multiplier / 100.0);
    }

    public List<MainQuestResponse> getMainQuestList(Long userId) {
        int chapter = userService.getMyInfo(userId).getLevel();

        log.debug("[MainQuest] 메인 퀘스트 목록 조회 - userId={}, chapter={}", userId, chapter);

        log.debug("[MainQuest] mainQuestTemplateRepository.findByChapterNo 호출 전 - chapter={}", chapter);
        List<MainQuestTemplate> templates = mainQuestTemplateRepository.findByChapterNo(chapter);
        log.debug("[MainQuest] mainQuestTemplateRepository.findByChapterNo 호출 후 - chapter={}, templateCount={}", chapter, templates.size());

        List<Long> templateIds = templates.stream().map(MainQuestTemplate::getId).toList();

        // templateId -> status 맵
        log.debug("[MainQuest] userMainQuestRepository.findByUserIdAndTemplateIds 호출 전 - userId={}, templateCount={}", userId, templateIds.size());
        Map<Long, String> statusMap = userMainQuestRepository
                .findByUserIdAndTemplateIds(userId, templateIds)
                .stream()
                .collect(Collectors.toMap(
                        uq -> uq.getMainQuestTemplate().getId(),
                        uq -> uq.getStatus().name(),
                        (existing, replacement) -> existing
                ));
        log.debug("[MainQuest] userMainQuestRepository.findByUserIdAndTemplateIds 호출 후 - 상태 보유 퀘스트 수={}", statusMap.size());

        return templates.stream()
                .map(template -> MainQuestResponse.from(template, statusMap.get(template.getId())))
                .toList();
    }

    @Override
    public QuestDetailResponse getMainQuestDetail(Long userId, Long questId) {
        log.debug("[MainQuest] 메인 퀘스트 상세 조회 (템플릿 기준) - userId={}, questId={}", userId, questId);

        //templateId
        log.debug("[MainQuest] mainQuestTemplateRepository.findById 호출 전 - questId={}", questId);
        MainQuestTemplate template = mainQuestTemplateRepository.findById(questId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));
        log.debug("[MainQuest] mainQuestTemplateRepository.findById 호출 후 - questId={}, title={}", questId, template.getTitle());

        log.debug("[MainQuest] userMainQuestRepository.findByUserIdAndTemplateId 호출 전 - userId={}, questId={}", userId, questId);
        String status = userMainQuestRepository
                .findByUserIdAndTemplateId(userId, questId)
                .map(uq -> uq.getStatus().name())
                .orElse(null);
        log.debug("[MainQuest] userMainQuestRepository.findByUserIdAndTemplateId 호출 후 - userId={}, questId={}, status={}", userId, questId, status);

        return QuestDetailResponse.fromMain(template, status);
    }

    //사용자 퀘스트 테이블
    @Override
    public QuestDetailResponse getUserMainQuestDetail(Long userId, Long questId) {
        log.debug("[MainQuest] 사용자 메인 퀘스트 상세 조회 (user_main_quest 기준) - userId={}, questId={}", userId, questId);

        log.debug("[MainQuest] userMainQuestRepository.findByIdAndUserId 호출 전 - userId={}, questId={}", userId, questId);
        return QuestDetailResponse.userDetailMain(userMainQuestRepository.findByIdAndUserId(questId, userId).orElseThrow(
                ()-> new BusinessException(ErrorCode.QUEST_NOT_FOUND)));
    }

    private void UserClearMainChapter(Long userId){
        MyInfoResponse myInfo = userService.getMyInfo(userId);
        int mainChapterCnt = mainQuestTemplateRepository.findByChapterNo(myInfo.getLevel()).size();
        int completeChapterCnt = userMainQuestRepository.findByUserIdAndChapterNoAndStatus(userId, myInfo.getLevel(),QuestStatus.CLAIMED).size();
        if(mainChapterCnt == completeChapterCnt) userService.levelUp(userId);
    }
}
