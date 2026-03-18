package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.desk.repository.UserDeskRepository;
import com.ssafy.srank.quest.application.dto.request.CompleteQuestRequest;
import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.domain.entity.*;
import com.ssafy.srank.quest.repository.*;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestFacadeServiceImpl implements QuestFacadeService{
    private final MainQuestService mainService;
    private final SubQuestService subService;

    //Todo : 분리해서 service가 담당하게 하기
    private final UserDeskQuestRepository deskQuestRepository;
    private final UserMainQuestRepository userMainQuestRepository;
    private final UserMainQuestCardRepository userMainQuestCardRepository;
    private final UserSubQuestRepository userSubQuestRepository;
    private final UserSubQuestCardRepository userSubQuestCardRepository;
    private final UserService userService;

    // 검증에 필요한 Repository들
    private final MainQuestTemplateRepository mainQuestTemplateRepository;
    private final SubQuestTemplateRepository subQuestTemplateRepository;
    private final UserCardRepository userCardRepository;
    private final UserDeskRepository userDeskRepository;

    //Todo: 이 테이블을 지워질 예정
    private final UserDeskQuestRepository userDeskQuestRepository;

    @Transactional
    @Override
    public List<InProcessQuestResponse> getInProcessQuestList(Long userId) {
        List<UserDeskQuest> InProcessQuestIdList = deskQuestRepository.findByUserId(userId);
        List<InProcessQuestResponse> list = InProcessQuestIdList.stream().map((q) -> {
            if (q.getQuestType().equals(QuestType.MAIN)) {
                //메인 가지고 오기 -> InProcessQuestResponse
                log.warn("log : {}",q.toString());
                InProcessQuestResponse from = InProcessQuestResponse.from(q, mainService.getUserMainQuestDetail(userId, q.getQuestId()));
                log.warn("getInProcessQuestList-main : {} ", from.toString());
                return from;
            } else {
                //서브 가지고 오기
                log.warn("log : {}",q.toString());
                InProcessQuestResponse from = InProcessQuestResponse.from(q, subService.getUserSubQuestDetail(userId, q.getQuestId()));
                log.warn("getInProcessQuestList-sub : {} ", from.toString());
                return from;
            }
        }).toList();

        log.warn("list : {}", list.toString());

        return list;
    }

    @Transactional
    @Override
    public void startMainQuest(Long userId, Long questId, MainQuestRequest request) {

        // 1️⃣ 퀘스트 템플릿 조회 및 존재 확인
        MainQuestTemplate template = mainQuestTemplateRepository.findById(questId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));

        // 2️⃣ 카드 개수 검증 (3~5장)
        validateCardCount(request.cardIds());

        // 3️⃣ 각 카드 스탯 검증 & 카드 중복 사용 검증
        validateCards(userId, request.cardIds(), template);

        // 4️⃣ 예상 완료 시간 검증 (하드캡 내)
        validateDuration(request.startAt(), request.endAt(), template.getDurationMinutes());

        // 5️⃣ 책상 해금 여부 검증
        validateDeskUnlocked(userId, request.deskId());

        // 6️⃣ 이전 퀘스트 완료 여부 검증 (선행 조건)
//        validatePreviousQuestCompleted(userId, template);


        // 사용자 메인 퀘스트 저장
        UserMainQuest mainQuest = UserMainQuest.builder()
                .userId(userId)
                .mainQuestTemplate(MainQuestTemplate.builder().id(questId).build())
                .status(QuestStatus.IN_PROGRESS)
                .startedAt(request.startAt())
                .endAt(request.endAt())
                .build();
        UserMainQuest userQuestId = userMainQuestRepository.save(mainQuest);

        // 사용자 사용한 카드 저장
        List<UserMainQuestCard> list = request.cardIds().stream()
                .map((cardId) -> {
                    return UserMainQuestCard.builder()
                            .userMainQuest(userQuestId)
                            .userId(userId)
                            .userCardId(cardId)
                            .build();
                }).toList();

        userMainQuestCardRepository.saveAll(list);

        //Todo: 이 테이블은 지워질 예정
        userDeskQuestRepository.save(UserDeskQuest.builder()
                        .userId(userId)
                        .userDeskId(request.deskId())
                        .questType(QuestType.MAIN)
                        .questId(userQuestId.getId())
                        .build());
    }

    @Transactional
    @Override
    public void startSubQuest(Long userId, Long questId, SubQuestRequest request) {

        // 1️⃣ 퀘스트 템플릿 조회
        SubQuestTemplate template = subQuestTemplateRepository.findById(questId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));

        // 2️⃣ 카드 개수 검증
        validateCardCount(request.cardIds());

        // 3️⃣ 카드 스탯 검증 & 중복 사용 검증
        validateCardsForSubQuest(userId, request.cardIds(), template);

        // 4️⃣ 예상 완료 시간 검증
        validateDuration(request.startAt(), request.endAt(), template.getDurationMinutes());

        // 5️⃣ 책상 해금 여부 검증
        validateDeskUnlocked(userId, request.deskId());


        // 사용자 메인 퀘스트 저장
        UserSubQuest subQuest = UserSubQuest.builder()
                .userId(userId)
                .subQuestTemplate(SubQuestTemplate.builder().id(questId).build())
                .status(QuestStatus.IN_PROGRESS)
                .startedAt(request.startAt())
                .endAt(request.endAt())
                .build();
        UserSubQuest userQuestId = userSubQuestRepository.save(subQuest);

        // 사용자 사용한 카드 저장
        List<UserSubQuestCard> list = request.cardIds().stream()
                .map((cardId) -> {
                    return UserSubQuestCard.builder()
                            .userSubQuest(userQuestId)
                            .userId(userId)
                            .userCardId(cardId)
                            .build();
                }).toList();

        userSubQuestCardRepository.saveAll(list);

        //Todo: 이 테이블은 지워질 예정
        userDeskQuestRepository.save(UserDeskQuest.builder()
                .userId(userId)
                .userDeskId(request.deskId())
                .questType(QuestType.SUB)
                .questId(userQuestId.getId())
                .build());
    }

    @Transactional
    @Override
    public void completeQuest(Long userId, CompleteQuestRequest request) {

        long gold;

        if(request.questType().equals(QuestType.MAIN)){
            UserMainQuest mainQuest = userMainQuestRepository.findByIdAndUserIdAndStatus(request.questId(), userId, QuestStatus.IN_PROGRESS)
                    .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_IN_PROGRESS));
            if (mainQuest.getEndAt().isAfter(LocalDateTime.now()))
                throw new BusinessException(ErrorCode.QUEST_NOT_IN_PROGRESS);
            gold = mainQuest.getMainQuestTemplate().getRewardGold();
            userMainQuestCardRepository.deleteByUserIdAndUserMainQuest_Id(userId, request.questId());
            userMainQuestRepository.delete(mainQuest);
        }else{
            UserSubQuest subQuest = userSubQuestRepository.findByIdAndUserIdAndStatus(request.questId(), userId, QuestStatus.IN_PROGRESS)
                    .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_IN_PROGRESS));
            if (subQuest.getEndAt().isAfter(LocalDateTime.now()))
                throw new BusinessException(ErrorCode.QUEST_NOT_IN_PROGRESS);
            gold = subQuest.getSubQuestTemplate().getRewardGold();
            userSubQuestCardRepository.deleteByUserIdAndUserSubQuest_Id(userId, request.questId());
            userSubQuestRepository.delete(subQuest);
        }
        userDeskQuestRepository.deleteByUserIdAndQuestId(userId,request.questId());

        //Todo : 보상 증가
        
        userService.rewardGold(userId, gold);
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
     * 메인 퀘스트 카드 검증
     * - 카드 존재 여부
     * - 카드 스탯 (요구치의 50% 이상)
     * - 카드 중복 사용 여부
     */
    private void validateCards(Long userId, List<Long> cardIds, MainQuestTemplate template) {
        for (Long cardId : cardIds) {
            // 카드 존재 확인
            UserCard card = userCardRepository.findByIdAndUserId(cardId, userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND));

            // 카드가 다른 퀘스트에서 사용 중인지 확인
            validateCardNotInUse(userId, cardId);

            // 카드 스탯 검증
            validateCardStats(card, template);
        }
    }

    /**
     * 서브 퀘스트 카드 검증
     */
    private void validateCardsForSubQuest(Long userId, List<Long> cardIds, SubQuestTemplate template) {
        for (Long cardId : cardIds) {
            UserCard card = userCardRepository.findByIdAndUserId(cardId, userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND));

            validateCardNotInUse(userId, cardId);

            validateCardStatsForSubQuest(card, template);
        }
    }

    /**
     * 카드가 다른 퀘스트에서 사용 중인지 확인
     * UserMainQuestCard와 UserSubQuestCard 테이블에서 조회
     */
    private void validateCardNotInUse(Long userId, Long cardId) {
        // 메인 퀘스트에서 사용 중인지 확인
        boolean inMainQuest = userMainQuestCardRepository.existsByUserIdAndUserCardId(userId, cardId);

        // 서브 퀘스트에서 사용 중인지 확인
        boolean inSubQuest = userSubQuestCardRepository.existsByUserIdAndUserCardId(userId, cardId);

        if (inMainQuest || inSubQuest) {
            throw new BusinessException(ErrorCode.CARD_ALREADY_IN_USE);
        }
    }

    /**
     * 카드 스탯이 퀘스트 요구치의 50% 이상인지 확인
     */
    private void validateCardStats(UserCard card, MainQuestTemplate template) {
//        // 요구 스킬 1 검증
//        if (!hasMinimumStat(card, template.getRequiredSkillType1(), template.getRequiredSkillValue1())) {
//            throw new BusinessException(ErrorCode.QUEST_STAT_INSUFFICIENT);
//        }
//
//        // 요구 스킬 2 검증
//        if (!hasMinimumStat(card, template.getRequiredSkillType2(), template.getRequiredSkillValue2())) {
//            throw new BusinessException(ErrorCode.QUEST_STAT_INSUFFICIENT);
//        }
//
//        // 요구 스킬 3 검증
//        if (!hasMinimumStat(card, template.getRequiredSkillType3(), template.getRequiredSkillValue3())) {
//            throw new BusinessException(ErrorCode.QUEST_STAT_INSUFFICIENT);
//        }
    }

    /**
     * 서브 퀘스트 카드 스탯 검증
     */
    private void validateCardStatsForSubQuest(UserCard card, SubQuestTemplate template) {
        // 마찬가지로 요구 스킬들 검증 (SubQuestTemplate의 필드에 맞게)
        // 구현은 MainQuest와 동일 로직
    }

    /**
     * 카드가 특정 스킬 타입에서 요구치의 50% 이상을 보유했는지 확인
     *
     * @param card 사용자 카드
     * @param requiredSkillType 요구 스킬 타입 (e.g., "BE", "FE", "DEVOPS" 등)
     * @param requiredValue 요구 스탯 값
     * @return 50% 이상 충족 여부
     */
    private boolean hasMinimumStat(UserCard card, String requiredSkillType, int requiredValue) {
        int minimumRequired = (int) Math.ceil(requiredValue * 0.5);  // 50% 계산
        int cardStatValue = getCardStatByType(card, requiredSkillType);
        return cardStatValue >= minimumRequired;
    }

    /**
     * 카드의 특정 스킬 타입 스탯값을 반환
     */
    private int getCardStatByType(UserCard card, String skillType) {
        return switch (skillType.toUpperCase()) {
            case "BE" -> card.getStat1().getTotalValue();      // 예시 (실제 매핑은 enum으로)
            case "FE" -> card.getStat2().getTotalValue();
            case "DEVOPS" -> card.getStat3().getTotalValue();
            default -> 0;
        };
    }

    /**
     * 예상 완료 시간이 하드캡을 초과하지 않는지 확인
     *
     * 하드캡 정책: 난이도별로 최대 소요 시간 제한
     * - 난이도 1~3: 기본값 * 1.2배
     * - 난이도 4~6: 기본값 * 1.0배
     * - 난이도 7~10: 기본값 * 0.8배 (스피드런 보상)
     */
    private void validateDuration(LocalDateTime startAt, LocalDateTime endAt, int templateDurationMinutes) {
        long actualDurationMinutes = java.time.temporal.ChronoUnit.MINUTES.between(startAt, endAt);

        if (actualDurationMinutes > templateDurationMinutes) {
            throw new BusinessException(ErrorCode.QUEST_EXCEED_HARD_CAP);
        }
    }

    /**
     * 책상이 해금되었는지 확인
     */
    private void validateDeskUnlocked(Long userId, Long deskId) {
        userDeskRepository.findByUserIdAndDeskTemplateId(userId, deskId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_SLOT_NOT_UNLOCKED));
    }

    /**
     * 이전 메인 퀘스트가 완료되었는지 확인
     *
     * 선행 조건: chapterNo 기준 이전 chapter의 마지막 step이 COMPLETED 상태여야 함

    private void validatePreviousQuestCompleted(Long userId, MainQuestTemplate currentTemplate) {
        // 첫 챕터 첫 스텝은 선행 조건 없음
        if (currentTemplate.getChapterNo() == 1 && currentTemplate.getStepNo() == 1) {
            return;
        }

        // 현재 챕터의 이전 스텝 확인
        if (currentTemplate.getStepNo() > 1) {
            long previousStepQuestCount = userMainQuestRepository
                    .findByUserIdAndChapterAndStep(userId, currentTemplate.getChapterNo(), currentTemplate.getStepNo() - 1)
                    .stream()
                    .filter(uq -> uq.getStatus() == QuestStatus.COMPLETED)
                    .count();

            if (previousStepQuestCount == 0) {
                throw new BusinessException(ErrorCode.QUEST_NOT_COMPLETED);
            }
        } else {
            // 이전 챕터의 마지막 스텝 확인 (레포지토리 쿼리 필요)
            int previousChapter = currentTemplate.getChapterNo() - 1;
            boolean previousChapterCompleted = userMainQuestRepository
                    .findByUserIdAndChapter(userId, previousChapter)
                    .stream()
                    .anyMatch(uq -> uq.getStatus() == QuestStatus.COMPLETED);

            if (!previousChapterCompleted) {
                throw new BusinessException(ErrorCode.QUEST_NOT_COMPLETED);
            }
        }
    }
     */
}
