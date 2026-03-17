package com.ssafy.srank.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtil {

    private SecurityUtil() {
    }

    public static Long getCurrentUserId() {
        return getCurrentPrincipal().userId();
    }

    public static String getCurrentPrivyId() {
        return getCurrentPrincipal().privyId();
    }

    private static CurrentUserPrincipal getCurrentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CurrentUserPrincipal principal)) {
            throw new IllegalStateException("No authenticated user found");
        }
        return principal;
    }
}
