package com.ssafy.srank.auth.domain.entity;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;

public enum AuthProvider {
    GOOGLE;

    public static AuthProvider from(String value) {
        if (value == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 OAuth Provider입니다.");
        }
        for (AuthProvider provider : values()) {
            if (provider.name().equalsIgnoreCase(value)) {
                return provider;
            }
        }
        throw new BusinessException(ErrorCode.INVALID_REQUEST, "지원하지 않는 OAuth Provider입니다.");
    }
}
