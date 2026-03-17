package com.ssafy.srank.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 전역 에러 코드 정의
 *
 * 코드 규칙:
 *   G  : Global / 공통
 *   AU : Auth (인증/인가)
 *   U  : User (유저)
 *   D  : Desk (책상)
 *   C  : Card (카드)
 *   Q  : Quest (퀘스트)
 *   GA : Gacha (뽑기)
 *   EN : Enhance (강화)
 *   SY : Synthesis (합성)
 *   TR : Trade (거래)
 *   BC : Blockchain (블록체인/NFT)
 *   RK : Ranking (랭킹)
 *   AC : Achievement (업적)
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // ======================== G : Global ========================
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "G001", "서버 내부 오류가 발생했습니다."),
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST,             "G002", "잘못된 입력 값입니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED,       "G003", "지원하지 않는 HTTP 메서드입니다."),
    ENTITY_NOT_FOUND(HttpStatus.NOT_FOUND,                  "G004", "요청한 리소스를 찾을 수 없습니다."),
    INVALID_TYPE_VALUE(HttpStatus.BAD_REQUEST,              "G005", "잘못된 타입의 값입니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN,                     "G006", "접근 권한이 없습니다."),
    RATE_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS,       "G007", "요청 한도를 초과했습니다."),

    // ======================== AU : Auth ========================
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED,               "AU001", "인증이 필요합니다."),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED,              "AU002", "토큰이 만료되었습니다."),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED,              "AU003", "유효하지 않은 토큰입니다."),
    DUPLICATE_LOGIN(HttpStatus.CONFLICT,                "AU004", "중복 로그인이 감지되었습니다."),
    SOCIAL_LOGIN_FAILED(HttpStatus.BAD_GATEWAY,         "AU005", "소셜 로그인 처리에 실패했습니다."),
    NICKNAME_DUPLICATE(HttpStatus.CONFLICT,             "AU006", "이미 사용 중인 닉네임입니다."),
    NICKNAME_INVALID(HttpStatus.BAD_REQUEST,            "AU007", "닉네임 형식이 올바르지 않습니다."),
    WITHDRAWN_USER(HttpStatus.FORBIDDEN,                "AU008", "탈퇴한 계정입니다."),

    // ======================== U : User ========================
    USER_NOT_FOUND(HttpStatus.NOT_FOUND,                "U001", "유저를 찾을 수 없습니다."),
    USER_ALREADY_EXISTS(HttpStatus.CONFLICT,            "U002", "이미 가입된 유저입니다."),
    INSUFFICIENT_GOLD(HttpStatus.BAD_REQUEST,           "U003", "골드가 부족합니다."),
    INSUFFICIENT_TOKEN(HttpStatus.BAD_REQUEST,          "U004", "토큰이 부족합니다."),
    WALLET_NOT_FOUND(HttpStatus.NOT_FOUND,              "U005", "지갑 정보를 찾을 수 없습니다."),
    WALLET_CREATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "U006", "지갑 생성에 실패했습니다."),

    // ======================== D : Desk (책상) ========================
    DESK_NOT_FOUND(HttpStatus.NOT_FOUND,                "D001", "책상을 찾을 수 없습니다."),
    DESK_ALREADY_UNLOCKED(HttpStatus.CONFLICT,          "D002", "이미 해금된 책상입니다."),
    DESK_INSUFFICIENT_LEVEL(HttpStatus.BAD_REQUEST,     "D003", "책상 해금에 필요한 레벨이 부족합니다."),

    // ======================== C : Card ========================
    CARD_NOT_FOUND(HttpStatus.NOT_FOUND,                "C001", "카드를 찾을 수 없습니다."),
    CARD_NOT_OWNED(HttpStatus.FORBIDDEN,                "C002", "보유하지 않은 카드입니다."),
    CARD_INVENTORY_FULL(HttpStatus.BAD_REQUEST,         "C003", "카드 인벤토리가 가득 찼습니다. (최대 200장)"),
    CARD_ALREADY_IN_USE(HttpStatus.CONFLICT,            "C004", "이미 퀘스트에 배치된 카드입니다."),
    CARD_ON_SALE(HttpStatus.CONFLICT,                   "C005", "거래소에 등록된 카드는 사용할 수 없습니다."),
    CARD_DELETED(HttpStatus.CONFLICT,                   "C006", "삭제된 카드입니다."),
    CARD_CANNOT_ENHANCE_DELETED(HttpStatus.CONFLICT,    "C007", "삭제된 카드는 강화할 수 없습니다."),
    CARD_ENHANCE_TRY_EXCEEDED(HttpStatus.BAD_REQUEST,   "C008", "강화 가능 횟수를 모두 소진했습니다."),

    // ======================== Q : Quest ========================
    QUEST_NOT_FOUND(HttpStatus.NOT_FOUND,               "Q001", "퀘스트를 찾을 수 없습니다."),
    QUEST_ALREADY_STARTED(HttpStatus.CONFLICT,          "Q002", "이미 진행 중인 퀘스트입니다."),
    QUEST_NOT_IN_PROGRESS(HttpStatus.BAD_REQUEST,       "Q003", "진행 중인 퀘스트가 아닙니다."),
    QUEST_CARD_COUNT_INVALID(HttpStatus.BAD_REQUEST,    "Q004", "퀘스트에 배치할 카드 수가 올바르지 않습니다. (3~5장)"),
    QUEST_STAT_INSUFFICIENT(HttpStatus.BAD_REQUEST,     "Q005", "카드 스탯이 퀘스트 요구치의 50%에 미치지 못합니다."),
    QUEST_EXCEED_HARD_CAP(HttpStatus.BAD_REQUEST,       "Q006", "예상 완료 시간이 하드캡을 초과합니다."),
    QUEST_SLOT_NOT_UNLOCKED(HttpStatus.FORBIDDEN,       "Q007", "해당 슬롯이 해금되지 않았습니다."),
    QUEST_NOT_COMPLETED(HttpStatus.BAD_REQUEST,         "Q008", "아직 완료되지 않은 퀘스트입니다."),
    INVALID_QUEST_TYPE(HttpStatus.BAD_REQUEST,          "Q009", "유효하지 않은 퀘스트 타입입니다."),

    // ======================== GA : Gacha ========================
    GACHA_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND,          "GA001", "존재하지 않는 뽑기 종류입니다."),
    GACHA_NOT_UNLOCKED(HttpStatus.FORBIDDEN,            "GA002", "해금되지 않은 뽑기입니다. 회사 단계를 높이세요."),
    GACHA_COUNT_INVALID(HttpStatus.BAD_REQUEST,         "GA003", "뽑기 횟수는 1회 또는 10회만 가능합니다."),
    GACHA_VRF_PENDING(HttpStatus.ACCEPTED,              "GA004", "VRF 결과 대기 중입니다."),
    GACHA_VRF_FAILED(HttpStatus.INTERNAL_SERVER_ERROR,  "GA005", "VRF 확률 처리에 실패했습니다."),

    // ======================== EN : Enhance (강화) ========================
    ENHANCE_NO_ATTEMPTS_LEFT(HttpStatus.BAD_REQUEST,    "EN001", "강화 횟수가 남아있지 않습니다. (최대 7회)"),
    ENHANCE_GRADE_NOT_ALLOWED(HttpStatus.BAD_REQUEST,   "EN002", "해당 등급 카드는 강화할 수 없습니다."),
    ENHANCE_VRF_FAILED(HttpStatus.INTERNAL_SERVER_ERROR,"EN003", "강화 VRF 처리에 실패했습니다."),

    // ======================== SY : Synthesis (합성) ========================
    SYNTHESIS_CARD_COUNT_INVALID(HttpStatus.BAD_REQUEST,"SY001", "합성에 필요한 카드 수가 올바르지 않습니다. (3~5장)"),
    SYNTHESIS_GRADE_MISMATCH(HttpStatus.BAD_REQUEST,    "SY002", "합성 카드의 등급이 일치하지 않습니다."),
    SYNTHESIS_MAX_GRADE(HttpStatus.BAD_REQUEST,         "SY003", "이미 최고 등급 카드입니다. S→S 합성은 2장만 가능합니다."),
    SYNTHESIS_VRF_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "SY004", "합성 VRF 처리에 실패했습니다."),

    // ======================== TR : Trade (거래) ========================
    TRADE_LISTING_NOT_FOUND(HttpStatus.NOT_FOUND,       "TR001", "거래 목록을 찾을 수 없습니다."),
    TRADE_SELF_PURCHASE(HttpStatus.BAD_REQUEST,         "TR002", "본인이 등록한 카드는 구매할 수 없습니다."),
    TRADE_ALREADY_SOLD(HttpStatus.CONFLICT,             "TR003", "이미 판매된 카드입니다."),
    TRADE_NOT_S_GRADE(HttpStatus.BAD_REQUEST,           "TR004", "S등급 카드만 NFT 민팅 및 거래소 등록이 가능합니다."),
    TRADE_NFT_MINTING_FAILED(HttpStatus.BAD_GATEWAY,    "TR005", "NFT 민팅에 실패했습니다. 우편함을 확인해주세요."),
    TRADE_ESCROW_FAILED(HttpStatus.BAD_GATEWAY,         "TR006", "에스크로 처리에 실패했습니다."),
    TRADE_INSUFFICIENT_ETH(HttpStatus.BAD_REQUEST,      "TR007", "가스비용 ETH가 부족합니다."),

    // ======================== BC : Blockchain ========================
    BLOCKCHAIN_TX_FAILED(HttpStatus.BAD_GATEWAY,        "BC001", "블록체인 트랜잭션 처리에 실패했습니다."),
    BLOCKCHAIN_TX_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT,   "BC002", "블록체인 트랜잭션 응답 시간이 초과되었습니다."),
    BLOCKCHAIN_TX_PENDING(HttpStatus.ACCEPTED,          "BC003", "블록체인 트랜잭션이 처리 중입니다."),

    // ======================== RK : Ranking ========================
    RANKING_NOT_FOUND(HttpStatus.NOT_FOUND,             "RK001", "랭킹 데이터를 찾을 수 없습니다."),

    // ======================== AC : Achievement (업적) ========================
    ACHIEVEMENT_NOT_FOUND(HttpStatus.NOT_FOUND,         "AC001", "업적을 찾을 수 없습니다."),
    ACHIEVEMENT_ALREADY_REWARDED(HttpStatus.CONFLICT,   "AC002", "이미 보상을 수령한 업적입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
