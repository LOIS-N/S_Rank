package com.ssafy.srank.auth.application.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
        String accessToken,
        Boolean isNewUser,
        String signupToken
) {
    public static LoginResponse existingUser(String accessToken) {
        return new LoginResponse(accessToken, false, null);
    }

    public static LoginResponse newUser(String signupToken) {
        return new LoginResponse(null, true, signupToken);
    }
}
