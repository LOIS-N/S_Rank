package com.ssafy.srank.mail.repository;

import com.ssafy.srank.mail.domain.entity.MailBox;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MailBoxRepository extends JpaRepository<MailBox, Long> {

    List<MailBox> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<MailBox> findByMailIdAndUserId(Long mailId, Long userId);
}