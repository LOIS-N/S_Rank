package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.facade.EconomyLogFacade;
import com.ssafy.srank.log.domain.entity.UserGoldLog;
import com.ssafy.srank.log.repository.UserGoldLogRepository;
import com.ssafy.srank.rabbitmq.log.message.GoldLogMessage;
import com.ssafy.srank.ranking.application.event.GoldEarnedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EconomyLogFacadeImpl implements EconomyLogFacade {

    private final UserGoldLogRepository userGoldLogRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public void recordGoldChange(GoldLogMessage command) {
        userGoldLogRepository.save(UserGoldLog.builder()
                .userId(command.userId())
                .amount(command.amount())
                .balanceAfter(command.balanceAfter())
                .reason(command.reason())
                .createdAt(command.createdAt())
                .build());

        if (command.amount() > 0) {
            eventPublisher.publishEvent(new GoldEarnedEvent(command.userId(), command.amount()));
        }
    }
}
