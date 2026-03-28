package com.ssafy.srank.mail.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.mail.application.dto.request.MailRequest;
import com.ssafy.srank.mail.application.dto.response.MailResponse;
import com.ssafy.srank.mail.domain.entity.MailBox;
import com.ssafy.srank.mail.repository.MailBoxRepository;
import com.ssafy.srank.user.application.service.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MailServiceImpl implements MailService{
    private final MailBoxRepository mailBoxRepository;
    // TODO: 보상 지급 서비스 있으면 주입
     private final UserService userService;

    @Override
    public List<MailResponse> getMailBoxes(Long userId) {
        return mailBoxRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(MailResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public Long claimMailRead(Long userId, Long mailId) {
        MailBox mailBox = mailBoxRepository.findByMailIdAndUserId(mailId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MAIL_NOT_FOUND));

        if (mailBox.isClaimed()) {
            throw new BusinessException(ErrorCode.MAIL_REWARD_ALREADY_CLAIMED);
        }

        /*
        * 업적을 통해 얻은 보상은 비동기로 전송됨 -> 블록체인 지갑으로 전송이 완료되면 우편으로 보상 받기 선택
        * */
        if(mailBox.getReward() != null) userService.rewardCoin(userId, (long)mailBox.getReward());

        mailBox.claimReward();
        mailBox.markAsRead();

        return Long.valueOf(mailBox.getReward() == null ? 0 : mailBox.getReward());
    }

    @Override
    public void postMail(MailRequest request) {
        mailBoxRepository.save(MailBox.builder()
                        .userId(request.userId())
                        .mailType(request.mailType())
                        .message(request.message())
                        .isRead(false)
                        .isClaimed(false)
                        .reward(request.reward())
                        .build());
    }
}
