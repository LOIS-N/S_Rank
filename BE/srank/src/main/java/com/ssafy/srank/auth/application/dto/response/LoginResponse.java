package com.ssafy.srank.auth.application.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResponse {

    @JsonProperty("isNewUser")
    private boolean isNewUser;
}
