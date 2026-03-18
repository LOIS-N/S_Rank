package com.ssafy.srank.config;

import com.ssafy.srank.SrankApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RequiredEnvironmentSmokeTest {

    @Test
    void productionStyleContextFailsWithoutRequiredExternalValues() {
        assertThatThrownBy(() -> new SpringApplicationBuilder(SrankApplication.class)
                .web(WebApplicationType.NONE)
                .properties(
                        "DB_URL=",
                        "DB_USERNAME=",
                        "DB_PASSWORD=",
                        "OPENAI_BASE_URL=",
                        "OPENAI_API_KEY=",
                        "PRIVY_APP_ID=",
                        "PRIVY_VERIFICATION_KEY=",
                        "spring.batch.job.enabled=false",
                        "app.ranking.batch.runner-enabled=false"
                )
                .run())
                .isInstanceOf(Exception.class);
    }
}
