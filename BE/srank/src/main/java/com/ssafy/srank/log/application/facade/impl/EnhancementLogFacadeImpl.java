package com.ssafy.srank.log.application.facade.impl;

import com.ssafy.srank.log.application.facade.EnhancementLogFacade;
import com.ssafy.srank.log.domain.entity.EnhancementLog;
import com.ssafy.srank.log.repository.EnhancementLogRepository;
import com.ssafy.srank.rabbitmq.log.message.EnhanceLogMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 강화 로그 기록 Facade 구현체.
 *
 * REQUIRES_NEW 전파 레벨을 사용하는 이유:
 * - 강화 트랜잭션(EnhancementServiceImpl)이 예외로 롤백되더라도
 *   로그는 독립적인 트랜잭션으로 반드시 저장되어야 한다.
 * - 즉, 로그 저장 실패가 강화 트랜잭션에 영향을 주지 않도록 분리한다.
 */
@Service
@RequiredArgsConstructor
public class EnhancementLogFacadeImpl implements EnhancementLogFacade {

    private final EnhancementLogRepository enhancementLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(EnhanceLogMessage command) {
        enhancementLogRepository.save(
                EnhancementLog.builder()
                        .userId(command.userId())
                        .userCardId(command.userCardId())
                        .tryNo(command.tryNo())
                        .success(command.success())
                        .beforeSuccessCount(command.beforeSuccessCount())
                        .afterSuccessCount(command.afterSuccessCount())
                        .increasedSkillType1(command.increasedSkillType1())
                        .increasedAmount1(command.increasedAmount1())
                        .increasedSkillType2(command.increasedSkillType2())
                        .increasedAmount2(command.increasedAmount2())
                        .increasedSkillType3(command.increasedSkillType3())
                        .increasedAmount3(command.increasedAmount3())
                        .costGold(command.costGold())
                        .createdAt(command.createdAt())
                        .build()
        );
    }
}
