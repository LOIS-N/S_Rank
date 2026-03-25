package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.log.application.command.SynthesisLogCommand;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;

public interface SynthesisLogFacade {

    Long record(SynthesisLogCommand command);

    void updateBlockchainResult(Long logId, BlockchainStatus status, String txHash);
}
