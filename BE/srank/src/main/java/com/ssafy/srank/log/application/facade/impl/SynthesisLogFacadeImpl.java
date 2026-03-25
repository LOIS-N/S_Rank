package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.command.SynthesisLogCommand;
import com.ssafy.srank.log.application.facade.SynthesisLogFacade;
import com.ssafy.srank.log.domain.entity.SynthesisLog;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;
import com.ssafy.srank.log.repository.SynthesisLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SynthesisLogFacadeImpl implements SynthesisLogFacade {

    private final SynthesisLogRepository synthesisLogRepository;

    @Override
    @Transactional
    public Long record(SynthesisLogCommand command) {
        List<Long> sourceIds = command.sourceUserCardIds();

        return synthesisLogRepository.saveAndFlush(SynthesisLog.builder()
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
                .blockchainStatus(command.blockchainStatus())
                .blockchainTxHash(command.blockchainTxHash())
                .createdAt(command.createdAt())
                .build()).getSynthesisLogId();
    }

    @Override
    @Transactional
    public void updateBlockchainResult(Long logId, BlockchainStatus status, String txHash) {
        synthesisLogRepository.findById(logId)
                .ifPresent(log -> log.updateBlockchainResult(status, txHash));
    }

    private Long sourceIdAt(List<Long> sourceIds, int index) {
        return index < sourceIds.size() ? sourceIds.get(index) : null;
    }
}
