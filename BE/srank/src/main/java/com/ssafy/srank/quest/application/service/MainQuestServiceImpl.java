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
        // TODO: 사용자 현재 챕터 번호 가져오기
        int chapter = userService.getMyInfo(userId).getLevel();

        List<MainQuestTemplate> templates = mainQuestTemplateRepository.findByChapterNo(chapter);

        List<Long> templateIds = templates.stream().map(MainQuestTemplate::getId).toList();

        // templateId -> status 맵
        Map<Long, String> statusMap = userMainQuestRepository
                .findByUserIdAndTemplateIds(userId, templateIds)
                .stream()
                .collect(Collectors.toMap(
                        uq -> uq.getMainQuestTemplate().getId(),
                        uq -> uq.getStatus().name(),
                        (existing, replacement) -> existing
                ));

        return templates.stream()
                .map(template -> MainQuestResponse.from(template, statusMap.get(template.getId())))
                .toList();
    }

    @Override
    public QuestDetailResponse getMainQuestDetail(Long userId, Long questId) {
        //templateId
        MainQuestTemplate template = mainQuestTemplateRepository.findById(questId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));

        String status = userMainQuestRepository
                .findByUserIdAndTemplateId(userId, questId)
                .map(uq -> uq.getStatus().name())
                .orElse(null);

        return QuestDetailResponse.fromMain(template, status);
    }

    //사용자 퀘스트 테이블
    @Override
    public QuestDetailResponse getUserMainQuestDetail(Long userId, Long questId) {
        return QuestDetailResponse.userDetailMain(userMainQuestRepository.findByIdAndUserId(questId, userId).orElseThrow(
                ()-> new BusinessException(ErrorCode.QUEST_NOT_FOUND)));
    }
}
