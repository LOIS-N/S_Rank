package com.ssafy.srank.mission.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.mission.application.dto.response.DailyMissionItemResponse;
import com.ssafy.srank.mission.application.dto.response.DailyMissionStatusResponse;
import com.ssafy.srank.mission.application.dto.response.MissionRewardClaimResponse;
import com.ssafy.srank.mission.domain.entity.MissionTemplate;
import com.ssafy.srank.mission.domain.entity.UserActivityLog;
import com.ssafy.srank.mission.domain.entity.UserRewardClaimed;
import com.ssafy.srank.mission.domain.enums.MissionCategory;
import com.ssafy.srank.mission.repository.MissionTemplateRepository;
import com.ssafy.srank.mission.repository.UserActivityLogRepository;
import com.ssafy.srank.mission.repository.UserRewardClaimedRepository;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MissionServiceImpl implements MissionService {

    private final MissionTemplateRepository missionTemplateRepository;
    private final UserActivityLogRepository userActivityLogRepository;
    private final UserRewardClaimedRepository userRewardClaimedRepository;
    private final UserRepository userRepository;

    @Override
    public DailyMissionStatusResponse getTodayMissions(Long userId) {
        validateActiveUser(userId);

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfNextDay = today.plusDays(1).atStartOfDay();

        List<MissionTemplate> missionTemplates = missionTemplateRepository.findAllByOrderByIdAsc();
        Map<MissionCategory, Long> activityCountMap = buildActivityCountMap(userId, startOfDay, startOfNextDay);
        Set<Long> claimedMissionIds = userRewardClaimedRepository.findClaimedMissionIds(userId, today);

        List<DailyMissionItemResponse> missions = missionTemplates.stream()
                .map(template -> DailyMissionItemResponse.of(
                        template,
                        activityCountMap.getOrDefault(template.getCategory(), 0L),
                        claimedMissionIds.contains(template.getId())
                ))
                .toList();

        return new DailyMissionStatusResponse(today, missions);
    }

    @Override
    @Transactional
    public MissionRewardClaimResponse claimTodayMissionReward(Long userId, Long missionId) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfNextDay = today.plusDays(1).atStartOfDay();

        MissionTemplate missionTemplate = missionTemplateRepository.findById(missionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MISSION_NOT_FOUND));

        User user = validateActiveUser(userId);

        if (userRewardClaimedRepository.existsByUser_UserIdAndMissionTemplate_IdAndClaimedDate(userId, missionId, today)) {
            throw new BusinessException(ErrorCode.MISSION_REWARD_ALREADY_CLAIMED);
        }

        long currentCount = userActivityLogRepository.countByUser_UserIdAndActivityTypeAndCreatedAtBetween(
                userId,
                missionTemplate.getCategory(),
                startOfDay,
                startOfNextDay
        );

        if (currentCount < missionTemplate.getRequiredCount()) {
            throw new BusinessException(ErrorCode.MISSION_NOT_COMPLETED);
        }

        UserRewardClaimed rewardClaimed = UserRewardClaimed.builder()
                .user(user)
                .missionTemplate(missionTemplate)
                .build();

        try {
            UserRewardClaimed saved = userRewardClaimedRepository.save(rewardClaimed);
            return MissionRewardClaimResponse.of(
                    missionTemplate,
                    saved.getClaimedDate(),
                    saved.getClaimedAt()
            );
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.MISSION_REWARD_ALREADY_CLAIMED);
        }
    }

    @Override
    @Transactional
    public void recordActivity(Long userId, MissionCategory category, int count) {
        User user = validateActiveUser(userId);

        if (count <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        LocalDateTime now = LocalDateTime.now();
        List<UserActivityLog> logs = java.util.stream.IntStream.range(0, count)
                .mapToObj(index -> UserActivityLog.builder()
                        .user(user)
                        .activityType(category)
                        .createdAt(now)
                        .build())
                .toList();

        userActivityLogRepository.saveAll(logs);
    }

    private Map<MissionCategory, Long> buildActivityCountMap(
            Long userId,
            LocalDateTime startOfDay,
            LocalDateTime startOfNextDay
    ) {
        Map<MissionCategory, Long> counts = new EnumMap<>(MissionCategory.class);

        userActivityLogRepository.countDailyActivities(userId, startOfDay, startOfNextDay)
                .forEach(row -> counts.put(row.getActivityType(), row.getActivityCount()));

        return counts;
    }

    private User validateActiveUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isWithdrawn()) {
            throw new BusinessException(ErrorCode.WITHDRAWN_USER);
        }
        return user;
    }
}
