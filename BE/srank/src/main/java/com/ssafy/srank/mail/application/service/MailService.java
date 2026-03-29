package com.ssafy.srank.mail.application.service;

import com.ssafy.srank.mail.application.dto.request.MailRequest;
import com.ssafy.srank.mail.application.dto.request.SystemMailRequest;
import com.ssafy.srank.mail.application.dto.response.MailResponse;

import java.util.List;

public interface MailService {
    List<MailResponse> getMailBoxes(Long userId);

    Long claimMailRead(Long userId, Long mailId);

    void postMail(MailRequest request);

    void postSystemMail(SystemMailRequest request);
}
