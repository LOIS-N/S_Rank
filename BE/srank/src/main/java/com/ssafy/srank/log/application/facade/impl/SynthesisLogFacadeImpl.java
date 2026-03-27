package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.command.SynthesisLogCommand;
import com.ssafy.srank.log.application.facade.SynthesisLogFacade;
import com.ssafy.srank.log.domain.entity.SynthesisLog;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;
import com.ssafy.srank.log.repository.SynthesisLogRepository;
import com.ssafy.srank.rabbitmq.log.message.SynthesisLogMessage;
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
    public void record(SynthesisLogMessage message) {
        synthesisLogRepository.save(SynthesisLog.builder()
                .userId(message.userId())
                .resultUserCardId(message.resultUserCardId())
                .success(message.success())
                .costGold(message.costGold())
                .sourceUserCardId1(message.sourceUserCardId1())
                .sourceUserCardId2(message.sourceUserCardId2())
                .sourceUserCardId3(message.sourceUserCardId3())
                .sourceUserCardId4(message.sourceUserCardId4())
                .sourceUserCardId5(message.sourceUserCardId5())
                .sourceCardGrade(message.sourceCardGrade())
                .clientSeed(message.clientSeed())
                .serverSeed(message.serverSeed())
                .algorithmVersion(message.algorithmVersion())
                .policyVersion(message.policyVersion())
                .resultRoll(message.resultRoll())
                .resultDigest(message.resultDigest())
                .blockchainStatus(BlockchainStatus.NOT_REQUESTED)
                .blockchainTxHash(null)
                .createdAt(message.createdAt())
                .build());
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
