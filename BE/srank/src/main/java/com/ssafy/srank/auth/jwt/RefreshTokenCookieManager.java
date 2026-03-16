package com.ssafy.srank.auth.jwt;

import com.ssafy.srank.common.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RefreshTokenCookieManager {

    private final AppProperties appProperties;

    public String createSetCookieHeader(String refreshToken) {
        return ResponseCookie.from(appProperties.getAuth().getRefreshCookieName(), refreshToken)
                .httpOnly(true)
                .secure(appProperties.getAuth().isRefreshCookieSecure())
                .path("/")
                .sameSite("Lax")
                .maxAge(appProperties.getAuth().getJwt().getRefreshExpirationSeconds())
                .build()
                .toString();
    }

    public String createDeleteCookieHeader() {
        return ResponseCookie.from(appProperties.getAuth().getRefreshCookieName(), "")
                .httpOnly(true)
                .secure(appProperties.getAuth().isRefreshCookieSecure())
                .path("/")
                .sameSite("Lax")
                .maxAge(0)
                .build()
                .toString();
    }

    public String extract(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        Optional<Cookie> cookie = Arrays.stream(request.getCookies())
                .filter(it -> appProperties.getAuth().getRefreshCookieName().equals(it.getName()))
                .findFirst();
        return cookie.map(Cookie::getValue).orElse(null);
    }
}
