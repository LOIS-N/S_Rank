package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.command.GachaDrawLogCommand;
import com.ssafy.srank.log.application.facade.GachaLogFacade;
import com.ssafy.srank.log.domain.entity.GachaLog;
import com.ssafy.srank.log.repository.GachaLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GachaLogFacadeImpl implements GachaLogFacade {

    private final GachaLogRepository gachaLogRepository;

    @Override
    public void recordDraw(GachaDrawLogCommand command) {
        // One gacha request expands into one row per created card snapshot.
        gachaLogRepository.saveAll(command.drawnCards().stream()
                .map(card -> GachaLog.builder()
                        .userId(command.userId())
                        .requestId(command.requestId())
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
                        .serverSeedHash(command.serverSeedHash())
                        .revealedServerSeed(command.revealedServerSeed())
                        .requestNonce(command.requestNonce())
                        .algorithmVersion(command.algorithmVersion())
                        .anchorPayload(command.anchorPayload())
                        .blockchainStatus(command.blockchainStatus())
                        .blockchainTxHash(command.blockchainTxHash())
                        .createdAt(command.createdAt())
                        .build())
                .toList());
    }
}
