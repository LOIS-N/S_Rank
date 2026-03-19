package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.command.QuestEventLogCommand;
import com.ssafy.srank.log.application.command.QuestStartLogCommand;
import com.ssafy.srank.log.application.facade.QuestLogFacade;
import com.ssafy.srank.log.domain.entity.UserMainQuestCardLog;
import com.ssafy.srank.log.domain.entity.UserMainQuestLog;
import com.ssafy.srank.log.domain.entity.UserSubQuestCardLog;
import com.ssafy.srank.log.domain.entity.UserSubQuestLog;
import com.ssafy.srank.log.domain.enums.QuestLogStatus;
import com.ssafy.srank.log.repository.UserMainQuestCardLogRepository;
import com.ssafy.srank.log.repository.UserMainQuestLogRepository;
import com.ssafy.srank.log.repository.UserSubQuestCardLogRepository;
import com.ssafy.srank.log.repository.UserSubQuestLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class QuestLogFacadeImpl implements QuestLogFacade {

    private final UserMainQuestLogRepository userMainQuestLogRepository;
    private final UserSubQuestLogRepository userSubQuestLogRepository;
    private final UserMainQuestCardLogRepository userMainQuestCardLogRepository;
    private final UserSubQuestCardLogRepository userSubQuestCardLogRepository;

    @Override
    public void recordMainQuestStarted(QuestStartLogCommand command) {
        userMainQuestLogRepository.save(UserMainQuestLog.builder()
                .userId(command.userId())
                .mainQuestTemplateId(command.templateId())
                .status(QuestLogStatus.IN_PROGRESS)
                .startedAt(command.startedAt())
                .createdAt(command.createdAt())
                .build());
    }

    @Override
    public void recordMainQuestCompleted(QuestEventLogCommand command) {
        userMainQuestLogRepository.save(toMainQuestLog(command));
    }

    @Override
    public void recordMainQuestClaimed(QuestEventLogCommand command) {
        userMainQuestLogRepository.save(toMainQuestLog(command));
    }

    @Override
    public void recordSubQuestStarted(QuestStartLogCommand command) {
        userSubQuestLogRepository.save(UserSubQuestLog.builder()
                .userId(command.userId())
                .subQuestTemplateId(command.templateId())
                .status(QuestLogStatus.IN_PROGRESS)
                .startedAt(command.startedAt())
                .createdAt(command.createdAt())
                .build());
    }

    @Override
    public void recordSubQuestCompleted(QuestEventLogCommand command) {
        userSubQuestLogRepository.save(toSubQuestLog(command));
    }

    @Override
    public void recordSubQuestClaimed(QuestEventLogCommand command) {
        userSubQuestLogRepository.save(toSubQuestLog(command));
    }

    @Override
    public void recordMainQuestCards(QuestStartLogCommand command) {
        userMainQuestCardLogRepository.saveAll(command.cards().stream()
                .map(card -> UserMainQuestCardLog.builder()
                        .userId(command.userId())
                        .userCardId(card.userCardId())
                        .skillType1(card.skillType1())
                        .skillValue1(card.skillValue1())
                        .skillType2(card.skillType2())
                        .skillValue2(card.skillValue2())
                        .skillType3(card.skillType3())
                        .skillValue3(card.skillValue3())
                        .specialSkillCode(card.specialSkillCode())
                        .specialSkillType(card.specialSkillType())
                        .specialSkillValue(card.specialSkillValue())
                        .build())
                .toList());
    }

    @Override
    public void recordSubQuestCards(QuestStartLogCommand command) {
        userSubQuestCardLogRepository.saveAll(command.cards().stream()
                .map(card -> UserSubQuestCardLog.builder()
                        .userId(command.userId())
                        .userCardId(card.userCardId())
                        .skillType1(card.skillType1())
                        .skillValue1(card.skillValue1())
                        .skillType2(card.skillType2())
                        .skillValue2(card.skillValue2())
                        .skillType3(card.skillType3())
                        .skillValue3(card.skillValue3())
                        .specialSkillCode(card.specialSkillCode())
                        .specialSkillType(card.specialSkillType())
                        .specialSkillValue(card.specialSkillValue())
                        .build())
                .toList());
    }

    private UserMainQuestLog toMainQuestLog(QuestEventLogCommand command) {
        return UserMainQuestLog.builder()
                .userId(command.userId())
                .mainQuestTemplateId(command.templateId())
                .status(command.status())
                .startedAt(command.startedAt())
                .completedAt(command.completedAt())
                .claimedAt(command.claimedAt())
                .actualDurationMinutes(command.actualDurationMinutes())
                .createdAt(command.createdAt())
                .build();
    }

    private UserSubQuestLog toSubQuestLog(QuestEventLogCommand command) {
        return UserSubQuestLog.builder()
                .userId(command.userId())
                .subQuestTemplateId(command.templateId())
                .status(command.status())
                .startedAt(command.startedAt())
                .completedAt(command.completedAt())
                .claimedAt(command.claimedAt())
                .actualDurationMinutes(command.actualDurationMinutes())
                .createdAt(command.createdAt())
                .build();
    }
}
