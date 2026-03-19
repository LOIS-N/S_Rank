package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.log.application.command.GachaDrawLogCommand;

public interface GachaLogFacade {

    void recordDraw(GachaDrawLogCommand command);
}
