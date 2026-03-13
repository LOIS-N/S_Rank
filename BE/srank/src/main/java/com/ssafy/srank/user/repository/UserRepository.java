package com.ssafy.srank.user.repository;

import com.ssafy.srank.auth.domain.entity.AuthProvider;
import com.ssafy.srank.user.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByProviderAndOauthId(AuthProvider provider, String oauthId);

    Optional<User> findByEmail(String email);

    Optional<User> findByIdAndDeletedAtIsNull(Long id);

    boolean existsByNicknameAndDeletedAtIsNull(String nickname);

    boolean existsByEmailAndDeletedAtIsNull(String email);
}
