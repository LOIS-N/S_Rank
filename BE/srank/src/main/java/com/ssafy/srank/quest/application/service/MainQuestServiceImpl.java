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
public class MainQuestServiceImpl implements MainQuestService {

    private final MainQuestTemplateRepository mainQuestTemplateRepository;
    private final UserMainQuestRepository userMainQuestRepository;

    /**
     * 현재 챕터의 메인 퀘스트 목록 조회
     * - 현재 챕터의 모든 스텝을 완료 여부, 진행중 여부와 함께 반환
     */
    public List<MainQuestResponse> getMainQuests(Long userId) {
        //Todo : 하드코딩 변경
        int chapter = 1; //사용자 정보에서 사용자 현재 챕터 번호 가져옴
        
        List<MainQuestTemplate> templates = mainQuestTemplateRepository.findByChapterNoAndIsActiveTrueOrderByStepNoAsc(1);
        if (templates.isEmpty()) {
            throw new BusinessException(ErrorCode.QUEST_NOT_FOUND);
        }

        Set<Long> claimedIds = userMainQuestRepository.findClaimedTemplateIdsByUserId(userId);
        Set<Long> inProgressIds = userMainQuestRepository.findInProgressTemplateIdsByUserId(userId);

        return templates.stream()
                .map(template -> MainQuestResponse.from(
                        template,
                        claimedIds.contains(template.getId()),
                        inProgressIds.contains(template.getId())
                ))
                .toList();

    }
}
