package com.ssafy.srank.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
// 인증 필터, 로그인, 토큰 검증 흐름을 기록한다.
public class AuthMetrics {

    private final MeterRegistry meterRegistry;

    // 인증 필터 처리 결과와 시간을 기록한다.
    public void recordFilter(long durationNanos, String result, String errorCode) {
        Counter.builder("srank.auth.filter.total")
                .description("Authentication filter outcomes")
                .tags("result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.auth.filter.duration")
                .description("Authentication filter duration")
                .tags("result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 로그인 결과와 시간을 login_type 기준으로 기록한다.
    public void recordLogin(long durationNanos, String loginType, String result, String errorCode) {
        Counter.builder("srank.auth.login.total")
                .description("Login flow outcomes")
                .tags("login_type", loginType, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.auth.login.duration")
                .description("Login flow duration")
                .tags("login_type", loginType, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    // 토큰 검증 결과와 시간을 token_type 기준으로 기록한다.
    public void recordTokenValidation(long durationNanos, String tokenType, String result, String errorCode) {
        Counter.builder("srank.auth.token.validation.total")
                .description("Privy token validation outcomes")
                .tags("token_type", tokenType, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .increment();

        Timer.builder("srank.auth.token.validation.duration")
                .description("Privy token validation duration")
                .tags("token_type", tokenType, "result", result, "error_code", errorCode)
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }
}
