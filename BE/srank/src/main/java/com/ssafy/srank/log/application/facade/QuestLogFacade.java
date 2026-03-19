package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.log.application.command.QuestEventLogCommand;
import com.ssafy.srank.log.application.command.QuestStartLogCommand;

public interface QuestLogFacade {

    void recordMainQuestStarted(QuestStartLogCommand command);

    void recordMainQuestCompleted(QuestEventLogCommand command);

    void recordMainQuestClaimed(QuestEventLogCommand command);

    void recordSubQuestStarted(QuestStartLogCommand command);

    void recordSubQuestCompleted(QuestEventLogCommand command);

    void recordSubQuestClaimed(QuestEventLogCommand command);

    void recordMainQuestCards(QuestStartLogCommand command);

    void recordSubQuestCards(QuestStartLogCommand command);
}
