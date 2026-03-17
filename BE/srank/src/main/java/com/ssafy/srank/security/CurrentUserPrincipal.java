package com.ssafy.srank.security;

public record CurrentUserPrincipal(
        Long userId,
        String privyId
) {
}
