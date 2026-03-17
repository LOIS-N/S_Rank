package com.ssafy.srank.common.exception;

import lombok.Getter;

/**
 * 비즈니스 로직 예외
 *
 * 서비스 레이어에서 throw new BusinessException(ErrorCode.XXX) 형태로 사용
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    /** 추가 메시지가 필요할 때 (로그용, 응답에는 errorCode.getMessage() 사용) */
    public BusinessException(ErrorCode errorCode, String detailMessage) {
        super(detailMessage);
        this.errorCode = errorCode;
    }
}
