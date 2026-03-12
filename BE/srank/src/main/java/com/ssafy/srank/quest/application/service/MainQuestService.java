package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.quest.application.dto.response.MainQuestResponse;
import com.ssafy.srank.quest.domain.entity.MainQuestTemplate;
import com.ssafy.srank.quest.repository.MainQuestTemplateRepository;
import com.ssafy.srank.quest.repository.UserMainQuestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MainQuestService {

    private final MainQuestTemplateRepository mainQuestTemplateRepository;
    private final UserMainQuestRepository userMainQuestRepository;

    /**
     * 현재 챕터의 메인 퀘스트 목록 조회
     * - 완료(CLAIMED)된 스텝이 모두 완료된 챕터는 다음 챕터로 이동
     * - 현재 챕터의 모든 스텝을 완료 여부와 함께 반환
     */
    public List<MainQuestResponse> getMainQuests(Long userId) {
        Set<Long> claimedIds = userMainQuestRepository.findClaimedTemplateIdsByUserId(userId);
        Set<Long> inProgressIds = userMainQuestRepository.findInProgressTemplateIdsByUserId(userId);

        // 현재 진행 챕터 계산 (완료되지 않은 첫 번째 챕터)
        int currentChapter = resolveCurrentChapter(userId, claimedIds);

        List<MainQuestTemplate> templates =
                mainQuestTemplateRepository.findByChapterNoAndIsActiveTrueOrderByStepNoAsc(currentChapter);

        if (templates.isEmpty()) {
            throw new BusinessException(ErrorCode.QUEST_NOT_FOUND);
        }

        return templates.stream()
                .map(template -> MainQuestResponse.from(
                        template,
                        claimedIds.contains(template.getId()),
                        inProgressIds.contains(template.getId())
                ))
                .toList();
    }

    /**
     * 모든 스텝이 완료된 챕터면 다음 챕터로 이동
     */
    private int resolveCurrentChapter(Long userId, Set<Long> claimedIds) {
        int chapter = mainQuestTemplateRepository.findMinChapterNo()
                .orElseThrow(() -> new BusinessException(ErrorCode.QUEST_NOT_FOUND));

        while (true) {
            List<MainQuestTemplate> steps =
                    mainQuestTemplateRepository.findByChapterNoAndIsActiveTrueOrderByStepNoAsc(chapter);

            if (steps.isEmpty()) break;

            boolean allCompleted = steps.stream()
                    .allMatch(t -> claimedIds.contains(t.getId()));

            if (!allCompleted) return chapter;

            chapter++;
        }

        // 모든 챕터 완료 시 마지막 챕터 유지
        return chapter - 1;
    }
}
