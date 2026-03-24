package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.quest.application.dto.request.MainQuestRequest;
import com.ssafy.srank.quest.application.dto.request.QuestDateTimeRequest;
import com.ssafy.srank.quest.application.dto.request.SubQuestRequest;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.application.dto.response.SubQuestResponse;
import com.ssafy.srank.quest.domain.entity.*;
import com.ssafy.srank.quest.repository.SubQuestTemplateRepository;
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


    @Override
    public List<InProcessQuestResponse> getUserSubQuestList(Long userId, LocalDateTime now) {
        return userSubQuestRepository.findByUserId(userId).stream()
                .map((quest)->{
                    Long second = quest.getStatus() == QuestStatus.COMPLETED
                            ? 0 : Duration.between(now, quest.getEndAt()).getSeconds();
                    return InProcessQuestResponse.fromUserSubQuest(quest, second);
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
    }

    @Override
    public Long claimRewardSubQuest(Long userId, Long questId) {
        UserSubQuest subQuest = userSubQuestRepository.findByIdAndUserIdAndStatus(questId, userId, QuestStatus.COMPLETED)
                .orElseThrow(()-> new BusinessException(ErrorCode.QUEST_NOT_COMPLETED));
        userSubQuestRepository.delete(subQuest);
        return (long) subQuest.getSubQuestTemplate().getRewardGold();
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
