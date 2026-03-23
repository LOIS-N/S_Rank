package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.config.RedisConfig;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.desk.repository.UserDeskRepository;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.quest.application.dto.request.CompleteQuestRequest;
import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
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
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestFacadeServiceImpl implements QuestFacadeService{

    private final StringRedisTemplate redisTemplate;
    private final ApplicationEventPublisher eventPublisher;

    private final MainQuestService mainService;
    private final SubQuestService subService;


    private final UserDeskQuestRepository deskQuestRepository; //얘 진짜 리팩토링하기 진짜....
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

//    @Transactional
//    @Override
//    public List<InProcessQuestResponse> getInProcessQuestList(Long userId) {
//        log.debug("[Quest] 진행 중인 퀘스트 목록 조회 시작 - userId={}", userId);
//
//        List<InProcessQuestResponse> list;
//
//        //main
//        mainService.
//
//        //sub
//
//
//
//        List<InProcessQuestResponse> list = InProcessQuestIdList.stream().map((q) -> {
//            if (q.getQuestType().equals(QuestType.MAIN)) {
//                log.debug("[Quest] MAIN 퀘스트 상세 조회 분기 - userId={}, questId={}", userId, q.getQuestId());
//                //메인 가지고 오기 -> InProcessQuestResponse
//                InProcessQuestResponse from = InProcessQuestResponse.from(q, mainService.getUserMainQuestDetail(userId, q.getQuestId()));
//                return from;
//            } else {
//                log.debug("[Quest] SUB 퀘스트 상세 조회 분기 - userId={}, questId={}", userId, q.getQuestId());
//                //서브 가지고 오기
//                InProcessQuestResponse from = InProcessQuestResponse.from(q, subService.getUserSubQuestDetail(userId, q.getQuestId()));
//                return from;
//            }
//        }).toList();
//
//        log.warn("list : {}", list.toString());
//
//        return list;
//    }

    @Transactional
    @Override
    public List<InProcessQuestResponse> getInProcessQuestList(Long userId) {
        log.debug("[Quest] 진행 중인 퀘스트 목록 조회 시작 - userId={}", userId);

        log.debug("[Quest] deskQuestRepository.findByUserId 호출 전 - userId={}", userId);
        List<UserDeskQuest> InProcessQuestIdList = deskQuestRepository.findByUserId(userId);
        log.debug("[Quest] deskQuestRepository.findByUserId 호출 후 - userId={}, count={}", userId, InProcessQuestIdList.size());

        List<InProcessQuestResponse> list = InProcessQuestIdList.stream().map((q) -> {
            if (q.getQuestType().equals(QuestType.MAIN)) {
                log.debug("[Quest] MAIN 퀘스트 상세 조회 분기 - userId={}, questId={}", userId, q.getQuestId());
                //메인 가지고 오기 -> InProcessQuestResponse
                InProcessQuestResponse from = InProcessQuestResponse.from(q, mainService.getUserMainQuestDetail(userId, q.getQuestId()));
                return from;
            } else {
                log.debug("[Quest] SUB 퀘스트 상세 조회 분기 - userId={}, questId={}", userId, q.getQuestId());
                //서브 가지고 오기
                InProcessQuestResponse from = InProcessQuestResponse.from(q, subService.getUserSubQuestDetail(userId, q.getQuestId()));
                return from;
            }
        }).toList();

        log.warn("list : {}", list.toString());

        return list;
    }


    @Transactional
    @Override
    public void startMainQuest(Long userId, Long questId, MainQuestRequest request) {
        log.debug("[Quest] 메인 퀘스트 시작 요청 - userId={}, questId={}, cardIds={}, deskId={}, startAt={}, endAt={}",
                userId, questId, request.cardIds(), request.deskId(), request.startAt(), request.endAt());

        // 1️⃣ 퀘스트 템플릿 조회 및 존재 확인
        log.debug("[Quest] mainQuestTemplateRepository.findById 호출 전 - questId={}", questId);
        MainQuestTemplate template = mainQuestTemplateRepository.findById(questId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));
        log.debug("[Quest] mainQuestTemplateRepository.findById 호출 후 - questId={}, title={}", questId, template.getTitle());

        // 2️⃣ 카드 개수 검증 (3~5장)
        validateCardCount(request.cardIds());

        // 3️⃣ 각 카드 스탯 검증 & 카드 중복 사용 검증
        validateCards(userId, request.cardIds(), template);

        // 4️⃣ 예상 완료 시간 검증 (하드캡 내)
//        validateDuration(request.startAt(), request.endAt(), template.getDurationMinutes());

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
        log.debug("[Quest] userMainQuestRepository.save 호출 전 - userId={}, questId={}", userId, questId);
        UserMainQuest userQuestId = userMainQuestRepository.save(mainQuest);
        log.debug("[Quest] userMainQuestRepository.save 호출 후 - userMainQuestId={}", userQuestId.getId());

        // 사용자 사용한 카드 저장
        List<UserMainQuestCard> list = request.cardIds().stream()
                .map((cardId) -> {
                    return UserMainQuestCard.builder()
                            .userMainQuest(userQuestId)
                            .userId(userId)
                            .userCardId(cardId)
                            .build();
                }).toList();

        log.debug("[Quest] userMainQuestCardRepository.saveAll 호출 전 - cardCount={}", list.size());
        userMainQuestCardRepository.saveAll(list);
        log.debug("[Quest] userMainQuestCardRepository.saveAll 호출 후");

        //Todo: 이 테이블은 지워질 예정
        userDeskQuestRepository.save(UserDeskQuest.builder()
                        .userId(userId)
                        .userDeskId(request.deskId())
                        .questType(QuestType.MAIN)
                        .questId(userQuestId.getId())
                        .build());

        //레디스 TTL 추가
        long seconds = Duration.between(mainQuest.getStartedAt(), mainQuest.getEndAt()).getSeconds();
        if (seconds <= 0) {
            // endAt이 startAt과 같거나 과거인 경우 — 테스트 목적으로 즉시 완료 처리
            log.warn("[Quest] TTL이 0 이하 - 즉시 completeQuest 호출 - userId={}, questId={}, seconds={}", userId, userQuestId.getId(), seconds);
            completeQuest(userId, userQuestId.getId(), "main");
            return;
        }
        String key = "quest:%d:%d:%s".formatted(userId, userQuestId.getId(), "main");
        redisTemplate.opsForValue().set(key,"1",Duration.ofSeconds(seconds));

        log.debug("[Quest] 메인 퀘스트 시작 완료 - userId={}, userMainQuestId={}, redisKey={}, ttlSeconds={}",
                userId, userQuestId.getId(), key, seconds);
    }

    @Transactional
    @Override
    public void startSubQuest(Long userId, Long questId, SubQuestRequest request) {
        log.debug("[Quest] 서브 퀘스트 시작 요청 - userId={}, questId={}, cardIds={}, deskId={}, startAt={}, endAt={}",
                userId, questId, request.cardIds(), request.deskId(), request.startAt(), request.endAt());

        // 1️⃣ 퀘스트 템플릿 조회
        log.debug("[Quest] subQuestTemplateRepository.findById 호출 전 - questId={}", questId);
        SubQuestTemplate template = subQuestTemplateRepository.findById(questId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));
        log.debug("[Quest] subQuestTemplateRepository.findById 호출 후 - questId={}, title={}", questId, template.getTitle());

        // 2️⃣ 카드 개수 검증
        validateCardCount(request.cardIds());

        // 3️⃣ 카드 스탯 검증 & 중복 사용 검증
//        validateCardsForSubQuest(userId, request.cardIds(), template);

        // 4️⃣ 예상 완료 시간 검증
//        validateDuration(request.startAt(), request.endAt(), template.getDurationMinutes());

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
        log.debug("[Quest] userSubQuestRepository.save 호출 전 - userId={}, questId={}", userId, questId);
        UserSubQuest userQuestId = userSubQuestRepository.save(subQuest);
        log.debug("[Quest] userSubQuestRepository.save 호출 후 - userSubQuestId={}", userQuestId.getId());

        // 사용자 사용한 카드 저장
        List<UserSubQuestCard> list = request.cardIds().stream()
                .map((cardId) -> {
                    return UserSubQuestCard.builder()
                            .userSubQuest(userQuestId)
                            .userId(userId)
                            .userCardId(cardId)
                            .build();
                }).toList();

        log.debug("[Quest] userSubQuestCardRepository.saveAll 호출 전 - cardCount={}", list.size());
        userSubQuestCardRepository.saveAll(list);
        log.debug("[Quest] userSubQuestCardRepository.saveAll 호출 후");

        //Todo: 이 테이블은 지워질 예정
        userDeskQuestRepository.save(UserDeskQuest.builder()
                .userId(userId)
                .userDeskId(request.deskId())
                .questType(QuestType.SUB)
                .questId(userQuestId.getId())
                .build());

        //레디스 TTL 추가
        long seconds = Duration.between(userQuestId.getStartedAt(), userQuestId.getEndAt()).getSeconds();
        if (seconds <= 0) {
            // endAt이 startAt과 같거나 과거인 경우 — 테스트 목적으로 즉시 완료 처리
            log.warn("[Quest] TTL이 0 이하 - 즉시 completeQuest 호출 - userId={}, questId={}, seconds={}", userId, userQuestId.getId(), seconds);
            completeQuest(userId, userQuestId.getId(), "sub");
            return;
        }
        String key = "quest:%d:%d:%s".formatted(userId, userQuestId.getId(), "sub");
        redisTemplate.opsForValue().set(key,"1",Duration.ofSeconds(seconds));

        log.debug("[Quest] 서브 퀘스트 시작 완료 - userId={}, userSubQuestId={}, redisKey={}, ttlSeconds={}",
                userId, userQuestId.getId(), key, seconds);
    }

    @Transactional
    @Override
    public void claimReward(Long userId, CompleteQuestRequest request) {
        log.debug("[Quest] 보상 수령 요청 - userId={}, questId={}, questType={}", userId, request.questId(), request.questType());

        long gold;

        if(request.questType().equals(QuestType.MAIN)){
            log.debug("[Quest] MAIN 보상 수령 분기 - userId={}, questId={}", userId, request.questId());
            log.debug("[Quest] userMainQuestRepository.findByIdAndUserIdAndStatus 호출 전");
            UserMainQuest mainQuest = userMainQuestRepository.findByIdAndUserIdAndStatus(request.questId(), userId, QuestStatus.COMPLETED)
                    .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_COMPLETED));
            gold = mainQuest.getMainQuestTemplate().getRewardGold();
            log.debug("[Quest] userMainQuestRepository.findByIdAndUserIdAndStatus 호출 후 - gold={}", gold);
            log.debug("[Quest] userMainQuestRepository.delete 호출 전 - questId={}", request.questId());
            userMainQuestRepository.delete(mainQuest);
            log.debug("[Quest] userMainQuestRepository.delete 호출 후");
        }else{
            log.debug("[Quest] SUB 보상 수령 분기 - userId={}, questId={}", userId, request.questId());
            log.debug("[Quest] userSubQuestRepository.findByIdAndUserIdAndStatus 호출 전");
            UserSubQuest subQuest = userSubQuestRepository.findByIdAndUserIdAndStatus(request.questId(), userId, QuestStatus.COMPLETED)
                    .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_COMPLETED));
            gold = subQuest.getSubQuestTemplate().getRewardGold();
            log.debug("[Quest] userSubQuestRepository.findByIdAndUserIdAndStatus 호출 후 - gold={}", gold);
            log.debug("[Quest] userSubQuestRepository.delete 호출 전 - questId={}", request.questId());
            userSubQuestRepository.delete(subQuest);
            log.debug("[Quest] userSubQuestRepository.delete 호출 후");
        }
        userDeskQuestRepository.deleteByUserIdAndQuestId(userId,request.questId());

        userService.rewardGold(userId, gold, GoldLogReason.QUEST_REWARD);

        log.debug("[Quest] 보상 수령 완료 - userId={}, questId={}, questType={}, gold={}",
                userId, request.questId(), request.questType(), gold);
    }

    public Set<Long> getUsedUserCardList(Long userId){
        List<InProcessQuestResponse> inProcessQuestList = getInProcessQuestList(userId);

        List<Long> mainCardIds = userMainQuestCardRepository.findByUserIdAndUserMainQuestIn(
                userId, inProcessQuestList.stream()
                        .map((q) -> {
                            return UserMainQuest.builder().id(q.getQuestId()).build();
                        }).toList()).stream().map(UserMainQuestCard::getUserCardId).toList();

        List<Long> subCardIds = userSubQuestCardRepository.findByUserIdAndUserSubQuestIn(userId, inProcessQuestList.stream()
                .map((q) -> {
                    return UserSubQuest.builder().id(q.getQuestId()).build();
                }).toList()).stream().map(UserSubQuestCard::getUserCardId).toList();

        Set<Long> result = new HashSet<>(mainCardIds);
        result.addAll(subCardIds);
        return result;
    }

    @Transactional
    @Override
    public void completeQuest(Long userId, Long questId, String type) {
        log.debug("[Quest] 퀘스트 완료 처리 - userId={}, questId={}, type={}", userId, questId, type);

        if(QuestType.valueOf(type.toUpperCase()) == QuestType.MAIN){
            log.debug("[Quest] MAIN 완료 처리 분기 - userId={}, questId={}", userId, questId);
            log.debug("[Quest] userMainQuestRepository.findByIdAndUserId 호출 전");
            UserMainQuest quest = userMainQuestRepository.findByIdAndUserId(questId, userId).orElseThrow(
                    () -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));
            log.debug("[Quest] userMainQuestRepository.findByIdAndUserId 호출 후");
            quest.completeStatus();
            //카드
            log.debug("[Quest] userMainQuestCardRepository.deleteByUserIdAndUserMainQuest_Id 호출 전");
            userMainQuestCardRepository.deleteByUserIdAndUserMainQuest_Id(userId, questId);
            log.debug("[Quest] userMainQuestCardRepository.deleteByUserIdAndUserMainQuest_Id 호출 후");
        }else{
            log.debug("[Quest] SUB 완료 처리 분기 - userId={}, questId={}", userId, questId);
            log.debug("[Quest] userSubQuestRepository.findByIdAndUserId 호출 전");
            UserSubQuest quest = userSubQuestRepository.findByIdAndUserId(questId, userId).orElseThrow(
                    () -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));
            log.debug("[Quest] userSubQuestRepository.findByIdAndUserId 호출 후");
            quest.completeStatus();
            log.debug("[Quest] userSubQuestCardRepository.deleteByUserIdAndUserSubQuest_Id 호출 전");
            userSubQuestCardRepository.deleteByUserIdAndUserSubQuest_Id(userId, questId);
            log.debug("[Quest] userSubQuestCardRepository.deleteByUserIdAndUserSubQuest_Id 호출 후");
        }

        log.debug("[Quest] 퀘스트 완료 상태 변경 및 카드 삭제 완료 - userId={}, questId={}, type={}", userId, questId, type);

        //이벤트 발행
        eventPublisher.publishEvent(
                new QuestCompletedEvent(
                        userId,
                        questId,
                        type,
                        "퀘스트가 완료되었습니다."
                )
        );

        log.debug("[Quest] QuestCompletedEvent 발행 완료 - userId={}, questId={}, type={}", userId, questId, type);
    }


    // ============ 검증 메소드들 ============

    /**
     * 카드 개수 검증 (3~5장)
     */
    private void validateCardCount(List<Long> cardIds) {
        log.debug("[Quest] 카드 개수 검증 - cardCount={}", cardIds.size());
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
            log.debug("[Quest] userCardRepository.findByIdAndUserId 호출 전 - userId={}, cardId={}", userId, cardId);
            UserCard card = userCardRepository.findByIdAndUserId(cardId, userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CARD_NOT_FOUND));
            log.debug("[Quest] userCardRepository.findByIdAndUserId 호출 후 - cardId={}", cardId);

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

        log.debug("[Quest] 카드 중복 사용 검증 - userId={}, cardId={}, inMainQuest={}, inSubQuest={}",
                userId, cardId, inMainQuest, inSubQuest);

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
        log.debug("[Quest] 책상 해금 여부 검증 - userId={}, deskId={}", userId, deskId);
        log.debug("[Quest] userDeskRepository.findByUserIdAndDeskTemplateId 호출 전 - userId={}, deskId={}", userId, deskId);
        userDeskRepository.findByUserIdAndDeskTemplateId(userId, deskId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_SLOT_NOT_UNLOCKED));
        log.debug("[Quest] userDeskRepository.findByUserIdAndDeskTemplateId 호출 후 - 해금 확인 완료");
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
