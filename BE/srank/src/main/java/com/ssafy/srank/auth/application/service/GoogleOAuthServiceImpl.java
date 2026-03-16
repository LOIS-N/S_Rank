package com.ssafy.srank.auth.application.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ssafy.srank.common.config.AppProperties;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
@RequiredArgsConstructor
public class GoogleOAuthServiceImpl implements GoogleOAuthService {

    private final AppProperties appProperties;
    private final RestClient.Builder restClientBuilder;

    @Override
    public GoogleUserInfo getUserInfo(String accessToken) {
        try {
            GoogleUserInfoResponse response = restClientBuilder.build()
                    .get()
                    .uri(appProperties.getAuth().getGoogleUserinfoUri())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(GoogleUserInfoResponse.class);

            if (response == null || response.sub() == null || response.email() == null) {
                throw new BusinessException(ErrorCode.OAUTH_FAILED);
            }
            return new GoogleUserInfo(response.sub(), response.email());
        } catch (RestClientException e) {
            throw new BusinessException(ErrorCode.OAUTH_FAILED);
        }
    }

    private record GoogleUserInfoResponse(
            String sub,
            String email,
            @JsonProperty("email_verified")
            Boolean emailVerified
    ) {
    }
}
