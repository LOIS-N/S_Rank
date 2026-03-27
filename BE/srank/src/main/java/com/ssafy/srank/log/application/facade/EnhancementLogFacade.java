package com.ssafy.srank.log.application.facade;

import com.ssafy.srank.rabbitmq.log.message.EnhanceLogMessage;

/**
 * 강화 로그 기록 Facade 인터페이스.
 * 강화 서비스(EnhancementServiceImpl)에서 호출하며,
 * 강화 트랜잭션과 독립적으로 로그를 저장한다.
 */
public interface EnhancementLogFacade {

    /**
     * 강화 1회 결과를 로그로 기록한다.
     *
     * @param command 강화 결과 데이터
     */
    void record(EnhanceLogMessage command);
}
