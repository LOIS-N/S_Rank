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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class PrivyAuthenticationFilter extends OncePerRequestFilter {

    private final PrivyTokenService privyTokenService;
    private final UserRepository userRepository;
    private final HandlerExceptionResolver handlerExceptionResolver;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return "/api/v1/auth/login".equals(uri)
                || "/error".equals(uri)
                || uri.startsWith("/v3/api-docs")
                || uri.startsWith("/swagger-ui")
                || uri.equals("/swagger-ui.html");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            System.out.println(">>>>> authHeader: [" + request.getHeader("Authorization") + "]");
            String privyId = privyTokenService.verifyAccessToken(request.getHeader("Authorization"));
            User user = userRepository.findByPrivyId(privyId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

            if (user.isWithdrawn()) {
                throw new BusinessException(ErrorCode.WITHDRAWN_USER);
            }

            CurrentUserPrincipal principal = new CurrentUserPrincipal(user.getUserId(), user.getPrivyId());
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    Collections.emptyList()
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (BusinessException e) {
            SecurityContextHolder.clearContext();
            handlerExceptionResolver.resolveException(request, response, null, e);
        }
    }
}
