package com.ssafy.srank.mission.repository;

import com.ssafy.srank.mission.domain.entity.UserActivityLog;
import com.ssafy.srank.mission.domain.enums.MissionCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {

    long countByUser_UserIdAndActivityTypeAndCreatedAtBetween(
            Long userId,
            MissionCategory activityType,
            LocalDateTime startOfDay,
            LocalDateTime startOfNextDay
    );

    @Query("""
            select ua.activityType as activityType, count(ua) as activityCount
            from UserActivityLog ua
            where ua.user.userId = :userId
              and ua.createdAt >= :startOfDay
              and ua.createdAt < :startOfNextDay
            group by ua.activityType
            """)
    List<DailyActivityCountProjection> countDailyActivities(
            @Param("userId") Long userId,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("startOfNextDay") LocalDateTime startOfNextDay
    );

    interface DailyActivityCountProjection {
        MissionCategory getActivityType();
        Long getActivityCount();
    }
}
