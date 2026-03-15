package com.ssafy.srank.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("S급 개발자가 나를 따르는 이유에 대하여 API")
                        .description("SSAFY 특화 프로젝트 API 명세서")
                        .version("v1.0.0"));
    }
}
