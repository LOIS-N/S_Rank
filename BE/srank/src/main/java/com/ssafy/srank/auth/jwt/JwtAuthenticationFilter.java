package com.ssafy.srank.auth.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.srank.auth.domain.entity.AuthSession;
import com.ssafy.srank.auth.repository.AuthSessionRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.security.AuthenticatedUser;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final AuthSessionRepository authSessionRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorization.substring(7);
        try {
            JwtTokenProvider.AccessTokenClaims claims = jwtTokenProvider.parseAccessToken(token);
            AuthSession session = authSessionRepository.findById(claims.sessionId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
            User user = userRepository.findById(claims.userId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

            if (session.isRevoked() || session.isExpired() || !session.getUserId().equals(user.getId()) || user.isWithdrawn()) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED);
            }

            session.touch();
            AuthenticatedUser principal = new AuthenticatedUser(user.getId(), session.getId());
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    Collections.emptyList()
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (BusinessException e) {
            SecurityContextHolder.clearContext();
            response.setStatus(e.getErrorCode().getHttpStatus().value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            objectMapper.writeValue(response.getWriter(), ApiResponse.fail(e.getErrorCode(), e.getMessage()));
        }
    }
}
