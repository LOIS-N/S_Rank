package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.rabbitmq.log.message.QuestMessage;

public interface QuestLogFacade {
    void record(QuestMessage message);
}
