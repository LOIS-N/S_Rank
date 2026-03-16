package com.ssafy.srank.user.domain.policy;

public final class NicknamePolicy {

    public static final String REGEX = "^[가-힣A-Za-z0-9]{2,8}$";
    public static final String VALIDATION_MESSAGE = "닉네임은 2~8자의 영문 대소문자, 숫자, 완성형 한글만 사용할 수 있습니다.";

    private NicknamePolicy() {
    }

    public static boolean isValid(String nickname) {
        return nickname != null && nickname.matches(REGEX);
    }
}
