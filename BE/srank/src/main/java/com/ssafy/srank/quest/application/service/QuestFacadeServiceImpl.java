package com.ssafy.srank.quest.application.service;

import com.ssafy.srank.quest.application.dto.response.InProcessQuestResponse;
import com.ssafy.srank.quest.domain.entity.QuestType;
import com.ssafy.srank.quest.domain.entity.UserDeskQuest;
import com.ssafy.srank.quest.repository.UserDeskQuestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestFacadeServiceImpl implements QuestFacadeService{
    private final MainQuestService mainService;
    private final SubQuestService subService;
    private final UserDeskQuestRepository deskQuestRepository;

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
}
