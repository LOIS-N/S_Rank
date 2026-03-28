package com.ssafy.srank.mail.application.dto.response;

import com.ssafy.srank.mail.domain.entity.MailBox;
import com.ssafy.srank.mail.domain.enums.MailType;

import java.time.LocalDateTime;

public record MailResponse(
        Long mailId,
        MailType mailType,
        boolean isRead,
        boolean isClaimed,
        String message,
        Integer reward,
        LocalDateTime createdAt
) {

    public static MailResponse from(MailBox mailBox) {
        return new MailResponse(
                mailBox.getMailId(),
                mailBox.getMailType(),
                mailBox.isRead(),
                mailBox.isClaimed(),
                mailBox.getMessage(),
                mailBox.getReward(),
                mailBox.getCreatedAt()
        );
    }
}