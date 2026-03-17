package com.ssafy.srank.common.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@Component
@ConfigurationProperties(prefix = "app.privy")
public class PrivyProperties {

    @NotBlank
    private String appId;

    @NotBlank
    private String issuer;

    @NotBlank
    private String verificationKey;
}
