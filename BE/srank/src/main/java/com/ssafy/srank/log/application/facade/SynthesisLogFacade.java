package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.log.application.command.SynthesisLogCommand;

public interface SynthesisLogFacade {

    void record(SynthesisLogCommand command);
}
