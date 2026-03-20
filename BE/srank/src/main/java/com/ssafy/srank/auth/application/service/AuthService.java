package com.ssafy.srank.auth.application.service;

import com.ssafy.srank.auth.application.dto.request.LoginRequest;
import com.ssafy.srank.auth.application.dto.response.LoginResponse;

public interface AuthService {

    LoginResponse login(String authorizationHeader, LoginRequest request);
}
