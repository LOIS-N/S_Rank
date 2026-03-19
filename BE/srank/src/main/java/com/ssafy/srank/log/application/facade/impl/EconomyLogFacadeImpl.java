package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.command.GoldLogCommand;
import com.ssafy.srank.log.application.facade.EconomyLogFacade;
import com.ssafy.srank.log.domain.entity.UserGoldLog;
import com.ssafy.srank.log.repository.UserGoldLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EconomyLogFacadeImpl implements EconomyLogFacade {

    private final UserGoldLogRepository userGoldLogRepository;

    @Override
    public void recordGoldChange(GoldLogCommand command) {
        userGoldLogRepository.save(UserGoldLog.builder()
                .userId(command.userId())
                .amount(command.amount())
                .balanceAfter(command.balanceAfter())
                .reason(command.reason())
                .createdAt(command.createdAt())
                .build());
    }
}
