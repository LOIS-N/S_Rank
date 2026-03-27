package com.ssafy.srank.mission.repository;

import com.ssafy.srank.mission.domain.entity.UserRewardClaimed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Set;

public interface UserRewardClaimedRepository extends JpaRepository<UserRewardClaimed, Long> {

    boolean existsByUser_UserIdAndMissionTemplate_IdAndClaimedDate(Long userId, Long missionId, LocalDate claimedDate);

    @Query("""
            select urc.missionTemplate.id
            from UserRewardClaimed urc
            where urc.user.userId = :userId
              and urc.claimedDate = :claimedDate
            """)
    Set<Long> findClaimedMissionIds(
            @Param("userId") Long userId,
            @Param("claimedDate") LocalDate claimedDate
    );
}
