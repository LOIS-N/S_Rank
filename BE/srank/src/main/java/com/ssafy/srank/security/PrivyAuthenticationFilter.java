package com.ssafy.srank.security;

import com.ssafy.srank.auth.application.service.PrivyTokenService;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
@Slf4j
public class PrivyAuthenticationFilter extends OncePerRequestFilter {

    private static final String SECURITY_FILTER_TAG = "[SECURITY][PRIVY_FILTER]";

    private final PrivyTokenService privyTokenService;
    private final UserRepository userRepository;
    private final HandlerExceptionResolver handlerExceptionResolver;

    @Value("${dev.backdoor.token:}")
    private String backdoorToken;

    @Value("${dev.backdoor.user-id:0}")
    private Long backdoorUserId;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        boolean shouldSkip = "/api/v1/auth/login".equals(uri)
                || "/error".equals(uri)
                || uri.startsWith("/v3/api-docs")
                || uri.startsWith("/swagger-ui")
                || uri.equals("/swagger-ui.html")
                || uri.startsWith("/actuator");  // 추가

        if (shouldSkip) {
            log.info("{} stage=filter.skip uri={}", SECURITY_FILTER_TAG, uri);
        }

        return shouldSkip;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        log.info("{} stage=filter.start method={} uri={} authHeaderPresent={}",
                SECURITY_FILTER_TAG, request.getMethod(), request.getRequestURI(), authHeader != null && !authHeader.isBlank());

        try {
            if (!backdoorToken.isEmpty() && ("Bearer " + backdoorToken).equals(authHeader)) {
                log.warn("{} stage=filter.backdoor-authenticated userId={}", SECURITY_FILTER_TAG, backdoorUserId);
                CurrentUserPrincipal principal = new CurrentUserPrincipal(backdoorUserId, "dev-backdoor");
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList())
                );
                filterChain.doFilter(request, response);
                return;
            }

            String privyId = privyTokenService.verifyAccessToken(authHeader);
            log.info("{} stage=filter.access-token.verified sub={}", SECURITY_FILTER_TAG, privyId);

            User user = userRepository.findByPrivyId(privyId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

            if (user.isWithdrawn()) {
                log.warn("{} stage=filter.user.withdrawn userId={} privyId={}",
                        SECURITY_FILTER_TAG, user.getUserId(), user.getPrivyId());
                throw new BusinessException(ErrorCode.WITHDRAWN_USER);
            }

            CurrentUserPrincipal principal = new CurrentUserPrincipal(user.getUserId(), user.getPrivyId());
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    Collections.emptyList()
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.info("{} stage=filter.authenticated userId={} privyId={}",
                    SECURITY_FILTER_TAG, user.getUserId(), user.getPrivyId());
            filterChain.doFilter(request, response);
        } catch (BusinessException e) {
            SecurityContextHolder.clearContext();
            log.warn("{} stage=filter.business-exception code={} uri={} exception={}",
                    SECURITY_FILTER_TAG, e.getErrorCode().getCode(), request.getRequestURI(), e.getClass().getSimpleName());
            handlerExceptionResolver.resolveException(request, response, null, e);
        }
    }
}
