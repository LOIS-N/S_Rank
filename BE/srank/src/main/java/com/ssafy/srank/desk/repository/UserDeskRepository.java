package com.ssafy.srank.desk.repository;

import com.ssafy.srank.desk.domain.entity.UserDesk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserDeskRepository extends JpaRepository<UserDesk, Long> {

    List<UserDesk> findByUserId(Long userId);

    boolean existsByUserIdAndDeskTemplate_Id(Long userId, Long deskTemplateId);

    Optional<UserDesk> findByUserIdAndDeskTemplateId(Long userId, Long deskId);
}
