package com.ssafy.srank.auth.application.service;

public interface PrivyTokenService {

    String verifyAccessToken(String authorizationHeader);

    PrivyIdentity verifyIdentityToken(String identityToken);
}
