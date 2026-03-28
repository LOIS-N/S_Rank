package com.ssafy.srank.mail.application.dto.request;

import com.ssafy.srank.mail.domain.enums.MailType;

import java.time.LocalDateTime;

public record MailRequest(
        Long userId,
        Long mailId,
        MailType mailType,
        boolean isRead,
        boolean isClaimed,
        String message,
        Integer reward,
        LocalDateTime createdAt
) {}