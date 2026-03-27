package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.rabbitmq.log.message.GoldLogMessage;

public interface EconomyLogFacade {

    void recordGoldChange(GoldLogMessage command);
}
