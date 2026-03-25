package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.log.application.command.GachaDrawLogCommand;

import java.util.List;

public interface GachaLogFacade {

    List<Long> recordDraw(GachaDrawLogCommand command);

    void updateBlockchainResult(List<Long> logIds, com.ssafy.srank.log.domain.enums.BlockchainStatus status, String txHash);
}
