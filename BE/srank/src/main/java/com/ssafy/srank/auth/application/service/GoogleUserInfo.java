package com.ssafy.srank.auth.application.service;

public record GoogleUserInfo(
        String subject,
        String email
) {
}
