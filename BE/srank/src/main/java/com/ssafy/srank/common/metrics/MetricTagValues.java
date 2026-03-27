package com.ssafy.srank.common.metrics;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;

import java.util.Locale;

public final class MetricTagValues {

    // 커스텀 메트릭에서 공통으로 쓰는 저카디널리티 태그 값 모음.
    public static final String RESULT_SUCCESS = "success";
    public static final String RESULT_FAILURE = "failure";
    public static final String RESULT_ERROR = "error";
    public static final String RESULT_IGNORED = "ignored";
    public static final String RESULT_PARTIAL_FAILURE = "partial_failure";
    public static final String ERROR_CODE_NONE = "none";
    public static final String ERROR_CODE_INTERNAL = "internal";
    public static final String VALUE_UNKNOWN = "unknown";

    private MetricTagValues() {
    }

    // 예외 객체에서 메트릭용 error_code 값을 뽑는다.
    public static String errorCode(Throwable throwable) {
        if (throwable instanceof BusinessException businessException) {
            return businessException.getErrorCode().getCode();
        }
        return ERROR_CODE_INTERNAL;
    }

    // ErrorCode enum을 메트릭 태그 값으로 변환한다.
    public static String errorCode(ErrorCode errorCode) {
        if (errorCode == null) {
            return ERROR_CODE_NONE;
        }
        return errorCode.getCode();
    }

    // enum 값을 소문자 태그 문자열로 바꾼다.
    public static String enumName(Enum<?> value) {
        if (value == null) {
            return VALUE_UNKNOWN;
        }
        return value.name().toLowerCase(Locale.ROOT);
    }

    // 일반 문자열을 공백 제거 후 소문자 태그 문자열로 바꾼다.
    public static String text(String value) {
        if (value == null || value.isBlank()) {
            return VALUE_UNKNOWN;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    // nullable Integer 값을 태그 문자열로 바꾼다.
    public static String number(Integer value) {
        if (value == null) {
            return VALUE_UNKNOWN;
        }
        return String.valueOf(value);
    }

    // int 값을 태그 문자열로 바꾼다.
    public static String number(int value) {
        return String.valueOf(value);
    }

    // long 값을 태그 문자열로 바꾼다.
    public static String number(long value) {
        return String.valueOf(value);
    }
}
