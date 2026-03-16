package com.ssafy.srank.common.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Auth auth = new Auth();
    private final Game game = new Game();

    @Getter
    @Setter
    public static class Auth {
        private final Jwt jwt = new Jwt();

        @NotBlank
        private String refreshCookieName;

        private boolean refreshCookieSecure;

        @NotBlank
        private String googleUserinfoUri;
    }

    @Getter
    @Setter
    public static class Jwt {
        @NotBlank
        private String secret;

        @Min(60)
        private long accessExpirationSeconds;

        @Min(60)
        private long refreshExpirationSeconds;

        @Min(60)
        private long signupExpirationSeconds;
    }

    @Getter
    @Setter
    public static class Game {
        private long initialGold;
        private long initialCoin;
    }
}
