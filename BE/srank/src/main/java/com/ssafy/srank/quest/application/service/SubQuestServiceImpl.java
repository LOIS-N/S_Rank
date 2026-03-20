package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.application.dto.response.SubQuestResponse;
import com.ssafy.srank.quest.domain.entity.SubQuestTemplate;
import com.ssafy.srank.quest.repository.SubQuestTemplateRepository;
import com.ssafy.srank.quest.repository.UserSubQuestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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

    public List<SubQuestResponse> getSubQuests(Long userId) {
        LocalDate today = LocalDate.now();

        log.debug("[SubQuest] 오늘의 서브 퀘스트 목록 조회 - userId={}, today={}", userId, today);

        log.debug("[SubQuest] subQuestTemplateRepository.findTodaySubQuests 호출 전 - today={}", today);
        List<SubQuestTemplate> templates = subQuestTemplateRepository.findTodaySubQuests(today);
        log.debug("[SubQuest] subQuestTemplateRepository.findTodaySubQuests 호출 후 - today={}, templateCount={}", today, templates.size());

        List<Long> templateIds = templates.stream().map(SubQuestTemplate::getId).toList();

        log.debug("[SubQuest] userSubQuestRepository.findByUserIdAndTemplateIds 호출 전 - userId={}, templateCount={}", userId, templateIds.size());
        Map<Long, String> statusMap = userSubQuestRepository
                .findByUserIdAndTemplateIds(userId, templateIds)
                .stream()
                .collect(Collectors.toMap(
                        uq -> uq.getSubQuestTemplate().getId(),
                        uq -> uq.getStatus().name(),
                        (existing, replacement) -> existing
                ));
        log.debug("[SubQuest] userSubQuestRepository.findByUserIdAndTemplateIds 호출 후 - 상태 보유 퀘스트 수={}", statusMap.size());

        return templates.stream()
                .map(template -> SubQuestResponse.from(template, statusMap.get(template.getId())))
                .toList();
    }

    /*
    *   서브퀘스트 템플릿 ID
    * */
    @Override
    public QuestDetailResponse getSubQuestDetail(Long userId, Long questId) {
        log.debug("[SubQuest] 서브 퀘스트 상세 조회 (템플릿 기준) - userId={}, questId={}", userId, questId);

        log.debug("[SubQuest] subQuestTemplateRepository.findById 호출 전 - questId={}", questId);
        SubQuestTemplate template = subQuestTemplateRepository.findById(questId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));
        log.debug("[SubQuest] subQuestTemplateRepository.findById 호출 후 - questId={}, title={}", questId, template.getTitle());

        log.debug("[SubQuest] userSubQuestRepository.findByUserIdAndTemplateId 호출 전 - userId={}, questId={}", userId, questId);
        String status = userSubQuestRepository
                .findByUserIdAndTemplateId(userId, questId)
                .map(uq -> uq.getStatus().name())
                .orElse(null);
        log.debug("[SubQuest] userSubQuestRepository.findByUserIdAndTemplateId 호출 후 - userId={}, questId={}, status={}", userId, questId, status);

        return QuestDetailResponse.fromSub(template, status);
    }

    @Override
    public QuestDetailResponse getUserSubQuestDetail(Long userId, Long questId) {
        log.debug("[SubQuest] 사용자 서브 퀘스트 상세 조회 (user_sub_quest 기준) - userId={}, questId={}", userId, questId);

        log.debug("[SubQuest] userSubQuestRepository.findByIdAndUserId 호출 전 - userId={}, questId={}", userId, questId);
        return QuestDetailResponse.userDetailSub(userSubQuestRepository.findByIdAndUserId(questId, userId).orElseThrow(
                ()-> new BusinessException(ErrorCode.QUEST_NOT_FOUND)));
    }
}
