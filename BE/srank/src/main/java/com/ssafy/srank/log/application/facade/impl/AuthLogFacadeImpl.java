package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.command.AuthLogCommand;
import com.ssafy.srank.log.application.facade.AuthLogFacade;
import com.ssafy.srank.log.domain.entity.UserAuthLog;
import com.ssafy.srank.log.repository.UserAuthLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthLogFacadeImpl implements AuthLogFacade {

    private final UserAuthLogRepository userAuthLogRepository;

    @Override
    public void recordSignup(AuthLogCommand command) {
        save(command);
    }

    @Override
    public void recordLogin(AuthLogCommand command) {
        save(command);
    }

    @Override
    public void recordWithdraw(AuthLogCommand command) {
        save(command);
    }

    private void save(AuthLogCommand command) {
        userAuthLogRepository.save(UserAuthLog.builder()
                .userId(command.userId())
                .eventType(command.eventType())
                .createdAt(command.createdAt())
                .build());
    }
}
