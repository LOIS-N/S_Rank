package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.command.GachaDrawLogCommand;
import com.ssafy.srank.log.application.facade.GachaLogFacade;
import com.ssafy.srank.log.domain.entity.GachaLog;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;
import com.ssafy.srank.log.repository.GachaLogRepository;
import com.ssafy.srank.rabbitmq.log.message.GachaLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GachaLogFacadeImpl implements GachaLogFacade {

    private final GachaLogRepository gachaLogRepository;

    @Override
    @Transactional
    public List<Long> recordDraw(GachaDrawLogCommand command) {
        // One gacha request expands into one row per created card snapshot.
        return gachaLogRepository.saveAllAndFlush(command.drawnCards().stream()
                .map(card -> GachaLog.builder()
                        .userId(command.userId())
                        .gachaType(command.gachaType())
                        .drawCount(command.drawCount())
                        .drawIndex(card.drawIndex())
                        .userCardId(card.userCardId())
                        .cardTemplateId(card.templateId())
                        .grade(card.grade())
                        .gradeRoll(card.gradeRoll())
                        .templateRoll(card.templateRoll())
                        .skillRoll(card.skillRoll())
                        .costGold(Math.toIntExact(command.totalCost()))
                        .tutorial(command.tutorial())
                        .skillType1(card.skillType1())
                        .skillValue1(card.skillValue1())
                        .skillType2(card.skillType2())
                        .skillValue2(card.skillValue2())
                        .skillType3(card.skillType3())
                        .skillValue3(card.skillValue3())
                        .specialSkillCode(card.specialSkillCode())
                        .clientSeed(command.clientSeed())
                        .serverSeed(command.serverSeed())
                        .algorithmVersion(command.algorithmVersion())
                        .anchorPayload(command.anchorPayload())
                        .blockchainStatus(command.blockchainStatus())
                        .blockchainTxHash(command.blockchainTxHash())
                        .createdAt(command.createdAt())
                        .build())
                .toList()).stream()
                .map(GachaLog::getGachaDrawId)
                .toList();
    }

    @Override
    @Transactional
    public void record(GachaLogMessage message) {
        gachaLogRepository.save(GachaLog.builder()
                .userId(message.userId())
                .gachaType(message.gachaType())
                .drawCount(message.drawCount())
                .drawIndex(message.drawIndex())
                .userCardId(message.userCardId())
                .cardTemplateId(message.cardTemplateId())
                .grade(message.grade())
                .gradeRoll(message.gradeRoll())
                .templateRoll(message.templateRoll())
                .skillRoll(message.skillRoll())
                .costGold(message.costGold())
                .tutorial(message.tutorial())
                .skillType1(message.skillType1())
                .skillValue1(message.skillValue1())
                .skillType2(message.skillType2())
                .skillValue2(message.skillValue2())
                .skillType3(message.skillType3())
                .skillValue3(message.skillValue3())
                .specialSkillCode(message.specialSkillCode())
                .clientSeed(message.clientSeed())
                .serverSeed(message.serverSeed())
                .algorithmVersion(message.algorithmVersion())
                .anchorPayload(message.anchorPayload())
                .blockchainStatus(message.blockchainStatus())
                .blockchainTxHash(message.blockchainTxHash())
                .createdAt(message.createdAt())
                .build());
    }

    @Override
    @Transactional
    public void updateBlockchainResult(List<Long> logIds, BlockchainStatus status, String txHash) {
        gachaLogRepository.findAllById(logIds)
                .forEach(log -> log.updateBlockchainResult(status, txHash));
    }
}
