package com.ssafy.srank.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ssafy.srank.common.exception.ErrorCode;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공통 API 응답 형식
 *
 * 성공:  ApiResponse.success(data)
 * 성공(데이터 없음): ApiResponse.success()
 * 실패:  ApiResponse.fail(errorCode)
 *
 * 응답 예시 (성공):
 * {
 *   "success": true,
 *   "data": { ... }
 * }
 *
 * 응답 예시 (실패):
 * {
 *   "success": false,
 *   "error": {
 *     "code": "C001",
 *     "message": "카드를 찾을 수 없습니다."
 *   }
 * }
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponse<T> {

    private boolean success;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private T data;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private ErrorDetail error;

    // ── 성공 ──────────────────────────────────────────────────────────────────

    public static <T> ApiResponse<T> success(T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = true;
        response.data = data;
        return response;
    }

    public static ApiResponse<Void> success() {
        ApiResponse<Void> response = new ApiResponse<>();
        response.success = true;
        return response;
    }

    // ── 실패 ──────────────────────────────────────────────────────────────────

    public static <T> ApiResponse<T> fail(ErrorCode errorCode) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = false;
        response.error = new ErrorDetail(errorCode.getCode(), errorCode.getMessage());
        return response;
    }

    public static <T> ApiResponse<T> fail(ErrorCode errorCode, String customMessage) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = false;
        response.error = new ErrorDetail(errorCode.getCode(), customMessage);
        return response;
    }

    // ── 내부 에러 상세 DTO ────────────────────────────────────────────────────

    @Getter
    @NoArgsConstructor(access = AccessLevel.PRIVATE)
    public static class ErrorDetail {
        private String code;
        private String message;

        public ErrorDetail(String code, String message) {
            this.code = code;
            this.message = message;
        }
    }
}
