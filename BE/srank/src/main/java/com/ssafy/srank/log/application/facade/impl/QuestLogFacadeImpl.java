package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.facade.QuestLogFacade;
import com.ssafy.srank.log.domain.entity.UserQuestLog;
import com.ssafy.srank.log.repository.UserQuestLogRepository;
import com.ssafy.srank.quest.domain.entity.QuestStatus;
import com.ssafy.srank.rabbitmq.log.message.QuestMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class QuestLogFacadeImpl implements QuestLogFacade {

    private final UserQuestLogRepository repository;

    @Transactional
    @Override
    public void record(QuestMessage message) {
        repository.save(UserQuestLog.builder()
                .userId(message.userId())
                .questType(message.questType())
                .questTemplateId(message.questTemplateId())
                .questId(message.questId())
                .duration(message.duration())
                .status(message.status())
                .createdAt(message.createdAt()).build());
    }
}
