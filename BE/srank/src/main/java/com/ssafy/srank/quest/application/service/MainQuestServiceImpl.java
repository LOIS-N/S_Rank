package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.application.dto.response.MainQuestResponse;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.domain.entity.MainQuestTemplate;
import com.ssafy.srank.quest.repository.MainQuestTemplateRepository;
import com.ssafy.srank.quest.repository.UserMainQuestRepository;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final UserService userService;

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
}
