package com.ssafy.srank.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "C-001", "잘못된 요청입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "C-002", "인증이 필요합니다."),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "C-003", "토큰이 만료되었습니다."),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "C-004", "유효하지 않은 토큰입니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "C-005", "접근 권한이 없습니다."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "C-006", "요청한 리소스를 찾을 수 없습니다."),
    DUPLICATE_REQUEST(HttpStatus.CONFLICT, "C-007", "중복된 요청입니다."),
    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "C-008", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C-009", "서버 오류가 발생했습니다."),
    SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "C-010", "현재 서비스를 이용할 수 없습니다."),

    OAUTH_FAILED(HttpStatus.UNAUTHORIZED, "A-001", "구글 로그인에 실패했습니다."),
    REFRESH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "A-002", "리프레시 토큰이 유효하지 않습니다."),
    REFRESH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "A-003", "리프레시 토큰이 만료되었습니다. 다시 로그인해 주세요."),
    DUPLICATE_LOGIN(HttpStatus.CONFLICT, "A-004", "이미 다른 기기에서 로그인 중입니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "A-005", "존재하지 않는 사용자입니다."),
    NICKNAME_DUPLICATE(HttpStatus.CONFLICT, "A-006", "이미 사용 중인 닉네임입니다."),
    NICKNAME_INVALID(HttpStatus.BAD_REQUEST, "A-007", "닉네임 형식이 올바르지 않습니다."),
    WITHDRAWN_USER(HttpStatus.FORBIDDEN, "A-008", "탈퇴한 계정입니다."),

    QUEST_CARD_COUNT_INVALID(HttpStatus.BAD_REQUEST, "Q-001", "퀘스트에 배치할 카드 수가 맞지 않습니다."),
    QUEST_STAT_UNDERSPEC(HttpStatus.BAD_REQUEST, "Q-002", "카드 능력치가 퀘스트 요구치의 50%에 미치지 못합니다."),
    QUEST_HARDCAP_EXCEEDED(HttpStatus.BAD_REQUEST, "Q-003", "예상 완료 시간이 최대 허용 시간을 초과합니다."),
    QUEST_ALREADY_RUNNING(HttpStatus.CONFLICT, "Q-004", "이미 진행 중인 퀘스트가 있습니다."),
    QUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "Q-005", "퀘스트를 찾을 수 없습니다."),
    QUEST_NOT_COMPLETED(HttpStatus.BAD_REQUEST, "Q-006", "아직 퀘스트가 완료되지 않았습니다."),
    QUEST_REWARD_ALREADY_CLAIMED(HttpStatus.CONFLICT, "Q-007", "이미 보상을 수령한 퀘스트입니다."),
    QUEST_LOCKED(HttpStatus.FORBIDDEN, "Q-008", "아직 해금되지 않은 퀘스트 난이도입니다."),
    QUEST_CARD_NOT_OWNED(HttpStatus.BAD_REQUEST, "Q-009", "본인 소유의 카드가 아닙니다."),
    QUEST_SUBQUEST_EXPIRED(HttpStatus.BAD_REQUEST, "Q-010", "오늘 생성된 서브 퀘스트만 수행할 수 있습니다."),

    CARD_NOT_FOUND(HttpStatus.NOT_FOUND, "CD-001", "카드를 찾을 수 없습니다."),
    CARD_NOT_OWNED(HttpStatus.FORBIDDEN, "CD-002", "본인 소유의 카드가 아닙니다."),
    CARD_INVENTORY_FULL(HttpStatus.CONFLICT, "CD-003", "카드 보관함이 가득 찼습니다. (최대 200장)"),
    CARD_LISTED_ON_MARKET(HttpStatus.CONFLICT, "CD-004", "거래소에 등록된 카드는 사용할 수 없습니다."),
    CARD_IN_QUEST(HttpStatus.CONFLICT, "CD-005", "퀘스트 진행 중인 카드는 사용할 수 없습니다."),

    ENHANCEMENT_MAX_REACHED(HttpStatus.BAD_REQUEST, "EN-001", "이미 최대 강화 횟수(7회)에 도달한 카드입니다."),
    ENHANCEMENT_GOLD_INSUFFICIENT(HttpStatus.BAD_REQUEST, "EN-002", "골드가 부족합니다."),
    ENHANCEMENT_IN_PROGRESS(HttpStatus.CONFLICT, "EN-003", "이미 강화가 진행 중입니다."),
    ENHANCEMENT_VRF_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "EN-004", "확률 검증 중 오류가 발생했습니다. 다시 시도해 주세요."),

    SYNTHESIS_CARD_COUNT_INVALID(HttpStatus.BAD_REQUEST, "SY-001", "합성에 필요한 카드 수가 맞지 않습니다. (3~5장)"),
    SYNTHESIS_GRADE_MISMATCH(HttpStatus.BAD_REQUEST, "SY-002", "같은 등급의 카드만 합성할 수 있습니다."),
    SYNTHESIS_GOLD_INSUFFICIENT(HttpStatus.BAD_REQUEST, "SY-003", "골드가 부족합니다."),
    SYNTHESIS_SAME_CARD_DUPLICATE(HttpStatus.BAD_REQUEST, "SY-004", "동일한 카드를 중복 선택할 수 없습니다."),
    SYNTHESIS_IN_PROGRESS(HttpStatus.CONFLICT, "SY-005", "이미 합성이 진행 중입니다."),
    SYNTHESIS_VRF_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "SY-006", "확률 검증 중 오류가 발생했습니다. 다시 시도해 주세요."),

    GACHA_INVALID_COUNT(HttpStatus.BAD_REQUEST, "GA-001", "뽑기 횟수는 1회 또는 10회만 가능합니다."),
    GACHA_GOLD_INSUFFICIENT(HttpStatus.BAD_REQUEST, "GA-002", "골드가 부족합니다."),
    GACHA_TYPE_LOCKED(HttpStatus.FORBIDDEN, "GA-003", "아직 해금되지 않은 뽑기입니다."),
    GACHA_TYPE_INVALID(HttpStatus.BAD_REQUEST, "GA-004", "유효하지 않은 뽑기 타입입니다."),
    GACHA_INVENTORY_FULL(HttpStatus.CONFLICT, "GA-005", "카드 보관함이 가득 차 뽑기를 진행할 수 없습니다."),
    GACHA_VRF_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GA-006", "뽑기 확률 검증 중 오류가 발생했습니다."),

    MARKET_NOT_S_GRADE(HttpStatus.FORBIDDEN, "MK-001", "S등급 카드만 거래소에 등록할 수 있습니다."),
    MARKET_PRICE_INVALID(HttpStatus.BAD_REQUEST, "MK-002", "판매 가격이 유효하지 않습니다."),
    MARKET_ALREADY_LISTED(HttpStatus.CONFLICT, "MK-003", "이미 거래소에 등록된 카드입니다."),
    MARKET_ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "MK-004", "거래소 매물을 찾을 수 없습니다."),
    MARKET_SELF_PURCHASE(HttpStatus.CONFLICT, "MK-005", "자신이 등록한 카드는 구매할 수 없습니다."),
    MARKET_TOKEN_INSUFFICIENT(HttpStatus.BAD_REQUEST, "MK-006", "토큰(ERC-20)이 부족합니다."),
    MARKET_ETH_INSUFFICIENT(HttpStatus.BAD_REQUEST, "MK-007", "가스비(ETH)가 부족합니다."),
    MARKET_NFT_MINTING(HttpStatus.CONFLICT, "MK-008", "NFT 민팅이 진행 중입니다. 잠시 후 다시 시도해 주세요."),
    MARKET_NFT_MINT_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "MK-009", "NFT 민팅에 실패했습니다."),
    MARKET_TX_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "MK-010", "거래 트랜잭션 처리에 실패했습니다."),

    ACHIEVEMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "AC-001", "업적을 찾을 수 없습니다."),
    ACHIEVEMENT_NOT_COMPLETED(HttpStatus.CONFLICT, "AC-002", "아직 달성되지 않은 업적입니다."),
    ACHIEVEMENT_ALREADY_CLAIMED(HttpStatus.CONFLICT, "AC-003", "이미 보상을 수령한 업적입니다."),
    ACHIEVEMENT_REWARD_CYCLE_INVALID(HttpStatus.BAD_REQUEST, "AC-004", "보상 수령 주기가 되지 않았습니다."),

    RANKING_INVALID_TYPE(HttpStatus.BAD_REQUEST, "RK-001", "유효하지 않은 랭킹 유형입니다."),

    MAIL_NOT_FOUND(HttpStatus.NOT_FOUND, "MB-001", "우편을 찾을 수 없습니다."),
    MAIL_ALREADY_READ(HttpStatus.CONFLICT, "MB-002", "이미 읽은 우편입니다."),

    NOTIFICATION_SSE_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "NT-001", "알림 연결에 실패했습니다. 다시 시도해 주세요."),

    BLOCKCHAIN_NODE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "BC-001", "블록체인 네트워크에 연결할 수 없습니다."),
    BLOCKCHAIN_TX_TIMEOUT(HttpStatus.INTERNAL_SERVER_ERROR, "BC-002", "트랜잭션 응답 시간이 초과되었습니다."),
    BLOCKCHAIN_NONCE_CONFLICT(HttpStatus.INTERNAL_SERVER_ERROR, "BC-003", "트랜잭션 nonce 충돌이 발생했습니다."),
    WALLET_NOT_FOUND(HttpStatus.BAD_REQUEST, "BC-004", "연결된 지갑이 없습니다."),
    VRF_REQUEST_PENDING(HttpStatus.BAD_REQUEST, "BC-005", "이전 VRF 요청이 아직 처리 중입니다."),

    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "X-405", "지원하지 않는 HTTP 메서드입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
