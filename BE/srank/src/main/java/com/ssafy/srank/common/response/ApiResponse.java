package com.ssafy.srank.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.ssafy.srank.common.exception.ErrorCode;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponse<T> {

    private String httpStatus;
    @JsonProperty("isSuccess")
    private boolean isSuccess;
    private String message;
    private Object code;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private T data;

    public static <T> ApiResponse<T> success(HttpStatus status, String message, T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.httpStatus = status.name();
        response.isSuccess = true;
        response.message = message;
        response.code = status.value();
        response.data = data;
        return response;
    }

    public static ApiResponse<Void> success(HttpStatus status, String message) {
        return success(status, message, null);
    }

    public static <T> ApiResponse<T> fail(ErrorCode errorCode) {
        return fail(errorCode, errorCode.getMessage());
    }

    public static <T> ApiResponse<T> fail(ErrorCode errorCode, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.httpStatus = errorCode.getHttpStatus().name();
        response.isSuccess = false;
        response.message = message;
        response.code = errorCode.getCode();
        return response;
    }
}
