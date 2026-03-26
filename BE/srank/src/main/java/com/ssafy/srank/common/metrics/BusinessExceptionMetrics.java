package com.ssafy.srank.common.metrics;

import com.ssafy.srank.common.exception.BusinessException;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
// 비즈니스 예외를 operation과 error_code 기준으로 집계한다.
public class BusinessExceptionMetrics {

    private final MeterRegistry meterRegistry;

    // 비즈니스 예외를 operation과 error_code 기준으로 카운트한다.
    public void record(String operation, BusinessException exception) {
        Counter.builder("srank.business.exception.total")
                .description("Business exceptions grouped by operation and error code")
                .tags("operation", operation, "error_code", exception.getErrorCode().getCode())
                .register(meterRegistry)
                .increment();
    }
}
