package com.ssafy.srank.mail.application.dto.request;
import com.ssafy.srank.mail.domain.enums.MailType;

public record MailRequest(
        Long userId,
        MailType mailType,
        String message,
        Long reward
) {}