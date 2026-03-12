package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
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
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubQuestService {

    private static final int SUB_QUEST_PER_DIFFICULTY = 5;

    private final SubQuestTemplateRepository subQuestTemplateRepository;
    private final UserSubQuestRepository userSubQuestRepository;

    /**
     * 당일 서브 퀘스트 목록 조회
     * - 당일 생성된 퀘스트만 노출
     * - 난이도별 최대 5개
     * - 진행 중 여부(isInProgress) 포함
     */
    public List<SubQuestResponse> getSubQuests(Long userId) {
        LocalDate today = LocalDate.now();

        // 난이도별 5개씩, 전체 난이도(1~6) 기준 최대 30개
        List<SubQuestTemplate> templates = subQuestTemplateRepository
                .findTodaySubQuestsByDifficulty(today, SUB_QUEST_PER_DIFFICULTY * 6);

        if (templates.isEmpty()) {
            throw new BusinessException(ErrorCode.QUEST_NOT_FOUND);
        }

        // 난이도별 5개로 제한
        List<SubQuestTemplate> limited = templates.stream()
                .collect(Collectors.groupingBy(SubQuestTemplate::getDifficulty))
                .values().stream()
                .flatMap(list -> list.stream().limit(SUB_QUEST_PER_DIFFICULTY))
                .toList();

        // 진행 중인 서브 퀘스트 템플릿 ID 조회
        Set<Long> inProgressIds = userSubQuestRepository.findInProgressTemplateIdsByUserId(userId);

        return limited.stream()
                .map(template -> SubQuestResponse.from(template, inProgressIds.contains(template.getId())))
                .toList();
    }
}
