package com.ssafy.srank.auth.application.service;

import com.ssafy.srank.auth.application.dto.request.LoginRequest;
import com.ssafy.srank.auth.application.dto.request.SignupRequest;
import com.ssafy.srank.auth.application.dto.response.AuthResult;
import com.ssafy.srank.auth.application.dto.response.LoginResponse;
import com.ssafy.srank.auth.application.dto.response.RefreshResponse;
import com.ssafy.srank.auth.application.dto.response.SignupResponse;
import com.ssafy.srank.security.AuthenticatedUser;

public interface AuthService {

    AuthResult<LoginResponse> login(LoginRequest request, String userAgent, String ipAddress);

    AuthResult<SignupResponse> signup(SignupRequest request, String userAgent, String ipAddress);

    AuthResult<RefreshResponse> refresh(String refreshTokenCookie);

    void logout(AuthenticatedUser authenticatedUser);
}
