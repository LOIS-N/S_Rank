package com.ssafy.srank.mail.application.dto.request;

import com.ssafy.srank.mail.domain.enums.MailType;

import java.time.LocalDateTime;

public record SystemMailRequest (
        String message,
        Long reward
) {}