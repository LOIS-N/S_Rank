package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.command.SynthesisLogCommand;
import com.ssafy.srank.log.application.facade.SynthesisLogFacade;
import com.ssafy.srank.log.domain.entity.SynthesisLog;
import com.ssafy.srank.log.repository.SynthesisLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SynthesisLogFacadeImpl implements SynthesisLogFacade {

    private final SynthesisLogRepository synthesisLogRepository;

    @Override
    public void record(SynthesisLogCommand command) {
        List<Long> sourceIds = command.sourceUserCardIds();

        synthesisLogRepository.save(SynthesisLog.builder()
                .userId(command.userId())
                .resultUserCardId(command.resultUserCardId())
                .success(command.success())
                .costGold(command.costGold())
                .sourceUserCardId1(sourceIdAt(sourceIds, 0))
                .sourceUserCardId2(sourceIdAt(sourceIds, 1))
                .sourceUserCardId3(sourceIdAt(sourceIds, 2))
                .sourceUserCardId4(sourceIdAt(sourceIds, 3))
                .sourceUserCardId5(sourceIdAt(sourceIds, 4))
                .sourceCardGrade(command.sourceCardGrade())
                .clientSeed(command.clientSeed())
                .serverSeed(command.serverSeed())
                .algorithmVersion(command.algorithmVersion())
                .policyVersion(command.policyVersion())
                .resultRoll(command.resultRoll())
                .resultDigest(command.resultDigest())
                .createdAt(command.createdAt())
                .build());
    }

    private Long sourceIdAt(List<Long> sourceIds, int index) {
        return index < sourceIds.size() ? sourceIds.get(index) : null;
    }
}
