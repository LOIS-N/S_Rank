package com.ssafy.srank.common.exception;

import com.ssafy.srank.common.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.stream.Collectors;

/**
 * 전역 예외 핸들러
 *
 * 처리 우선순위:
 *   1. BusinessException     → 비즈니스 로직 예외 (서비스에서 throw)
 *   2. Validation 예외       → @Valid, @RequestParam 등 입력값 검증 실패
 *   3. Spring MVC 예외       → 메서드 불일치, 타입 불일치 등
 *   4. Exception             → 그 외 예상치 못한 예외
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 1. BusinessException ─────────────────────────────────────────────────

    /**
     * 서비스 레이어에서 throw new BusinessException(ErrorCode.XXX) 시 처리
     */
    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.warn("[BusinessException] code={}, message={}", e.getErrorCode().getCode(), e.getMessage());
        ErrorCode errorCode = e.getErrorCode();
        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.fail(errorCode));
    }

    // ── 2. Validation 예외 ────────────────────────────────────────────────────

    /**
     * @Valid / @Validated + @RequestBody 검증 실패
     * DTO 필드의 @NotNull, @Size, @Min 등
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValid(
            MethodArgumentNotValidException e) {

        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> String.format("[%s] %s", fe.getField(), fe.getDefaultMessage()))
                .collect(Collectors.joining(", "));

        log.warn("[ValidationException] {}", message);

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.fail(ErrorCode.INVALID_INPUT_VALUE, message));
    }

    /**
     * @ModelAttribute 검증 실패 (form data, query params)
     */
    @ExceptionHandler(BindException.class)
    protected ResponseEntity<ApiResponse<Void>> handleBindException(BindException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> String.format("[%s] %s", fe.getField(), fe.getDefaultMessage()))
                .collect(Collectors.joining(", "));

        log.warn("[BindException] {}", message);

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.fail(ErrorCode.INVALID_INPUT_VALUE, message));
    }

    /**
     * @RequestParam 누락
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    protected ResponseEntity<ApiResponse<Void>> handleMissingParam(
            MissingServletRequestParameterException e) {

        String message = String.format("필수 파라미터 '%s'가 누락되었습니다.", e.getParameterName());
        log.warn("[MissingParam] {}", message);

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.fail(ErrorCode.INVALID_INPUT_VALUE, message));
    }

    /**
     * @PathVariable / @RequestParam 타입 불일치 (예: Long 자리에 문자열)
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    protected ResponseEntity<ApiResponse<Void>> handleTypeMismatch(
            MethodArgumentTypeMismatchException e) {

        String message = String.format("파라미터 '%s'의 타입이 올바르지 않습니다.", e.getName());
        log.warn("[TypeMismatch] {}", message);

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.fail(ErrorCode.INVALID_TYPE_VALUE, message));
    }

    /**
     * JSON 파싱 실패 (요청 바디가 올바르지 않은 JSON)
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    protected ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadable(
            HttpMessageNotReadableException e) {

        log.warn("[NotReadable] {}", e.getMessage());

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.fail(ErrorCode.INVALID_INPUT_VALUE, "요청 바디를 읽을 수 없습니다. JSON 형식을 확인하세요."));
    }

    // ── 3. Spring MVC 예외 ────────────────────────────────────────────────────

    /**
     * 지원하지 않는 HTTP 메서드 (예: GET 자리에 POST)
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    protected ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException e) {

        log.warn("[MethodNotAllowed] {}", e.getMessage());

        return ResponseEntity
                .status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.fail(ErrorCode.METHOD_NOT_ALLOWED));
    }

    // ── 4. 그 외 모든 예외 ────────────────────────────────────────────────────

    /**
     * 예상치 못한 서버 에러
     * Sentry 등 외부 모니터링이 있다면 여기서 추가 리포팅 가능
     */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("[UnhandledException] {}", e.getMessage(), e);

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.fail(ErrorCode.INTERNAL_SERVER_ERROR));
    }
}
