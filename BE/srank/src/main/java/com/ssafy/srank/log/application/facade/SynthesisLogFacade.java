package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.log.application.command.SynthesisLogCommand;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;
import com.ssafy.srank.rabbitmq.log.message.SynthesisLogMessage;

public interface SynthesisLogFacade {

    Long record(SynthesisLogCommand command);

    void record(SynthesisLogMessage message);

    void updateBlockchainResult(Long logId, BlockchainStatus status, String txHash);
}
