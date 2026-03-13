package com.ssafy.srank.security;

public record AuthenticatedUser(
        Long userId,
        String sessionId
) {
}
