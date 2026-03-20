package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.log.application.command.GoldLogCommand;

public interface EconomyLogFacade {

    void recordGoldChange(GoldLogCommand command);
}
