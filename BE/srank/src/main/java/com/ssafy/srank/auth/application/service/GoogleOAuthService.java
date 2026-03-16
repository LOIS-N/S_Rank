package com.ssafy.srank.auth.application.service;

public interface GoogleOAuthService {

    GoogleUserInfo getUserInfo(String accessToken);
}
