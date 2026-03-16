package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.quest.application.dto.response.QuestDetailResponse;
import com.ssafy.srank.quest.application.dto.response.SubQuestResponse;
import com.ssafy.srank.quest.domain.entity.SubQuestTemplate;
import com.ssafy.srank.quest.repository.SubQuestTemplateRepository;
import com.ssafy.srank.quest.repository.UserSubQuestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubQuestServiceImpl implements SubQuestService {

    private final SubQuestTemplateRepository subQuestTemplateRepository;
    private final UserSubQuestRepository userSubQuestRepository;

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
}
