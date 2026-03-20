package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.log.application.command.AuthLogCommand;

public interface AuthLogFacade {

    void recordSignup(AuthLogCommand command);

    void recordLogin(AuthLogCommand command);

    void recordWithdraw(AuthLogCommand command);
}
