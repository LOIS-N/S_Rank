package com.ssafy.srank.mail.presentation;

import com.ssafy.srank.common.response.ApiResponse;
import com.ssafy.srank.mail.application.dto.response.MailResponse;
import com.ssafy.srank.mail.application.service.MailService;
import com.ssafy.srank.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mailboxes")
@RequiredArgsConstructor
public class MailController {

    private final MailService mailService;

    /**
     * 우편함 목록 조회
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<MailResponse>>> getMailBoxes() {
        return ResponseEntity.ok(ApiResponse.success(mailService.getMailBoxes(SecurityUtil.getCurrentUserId())));
    }

    /**
     * 우편 보상 수령
     * 네가 요청한 경로 기준: /api/v1/mailboxes/{mailId}/read
     */
    @PutMapping("/{mailId}/read")
    public ResponseEntity<ApiResponse<Long>> claimMailReward(@PathVariable Long mailId) {
        return ResponseEntity.ok(ApiResponse.success(mailService.claimMailRead(SecurityUtil.getCurrentUserId(), mailId)));
    }
}
