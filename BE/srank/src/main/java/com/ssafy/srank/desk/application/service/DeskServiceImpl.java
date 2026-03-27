package com.ssafy.srank.desk.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.metrics.BusinessExceptionMetrics;
import com.ssafy.srank.common.metrics.DeskMetrics;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.desk.application.dto.response.DeskTemplateResponse;
import com.ssafy.srank.desk.domain.entity.DeskTemplate;
import com.ssafy.srank.desk.domain.entity.UserDesk;
import com.ssafy.srank.desk.repository.DeskTemplateRepository;
import com.ssafy.srank.desk.repository.UserDeskRepository;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeskServiceImpl implements DeskService {

    private final DeskTemplateRepository deskTemplateRepository;
    private final UserDeskRepository userDeskRepository;
    private final UserService userService;
    private final DeskMetrics deskMetrics;
    private final BusinessExceptionMetrics businessExceptionMetrics;

    @Override
    @Transactional(readOnly = true)
    public List<DeskTemplateResponse> getDeskTemplateList(Long userId) {
        Set<Long> unlockedIds = userDeskRepository.findByUserId(userId)
                .stream()
                .map(ud -> ud.getDeskTemplate().getId())
                .collect(Collectors.toSet());

        return deskTemplateRepository.findAll()
                .stream()
                .map(t -> DeskTemplateResponse.from(t, unlockedIds.contains(t.getId())))
                .toList();
    }

    @Override
    @Transactional
    public void unlockDesk(Long userId, Long deskTemplateId) {
        long startNanos = System.nanoTime();
        String result = MetricTagValues.RESULT_SUCCESS;
        String errorCode = MetricTagValues.ERROR_CODE_NONE;

        try {
            DeskTemplate template = deskTemplateRepository.findById(deskTemplateId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.DESK_NOT_FOUND));

            if (userDeskRepository.existsByUserIdAndDeskTemplate_Id(userId, deskTemplateId)) {
                throw new BusinessException(ErrorCode.DESK_ALREADY_UNLOCKED);
            }

            int userLevel = userService.getMyInfo(userId).getLevel();
            if (!template.isUnlockable(userLevel)) {
                throw new BusinessException(ErrorCode.DESK_INSUFFICIENT_LEVEL);
            }

            userService.spendGold(userId, (long) template.getUnlockCostGold(), GoldLogReason.DESK_UNLOCK_SPEND);
            userDeskRepository.save(UserDesk.builder()
                    .userId(userId)
                    .deskTemplate(template)
                    .build());
        } catch (BusinessException e) {
            result = MetricTagValues.RESULT_FAILURE;
            errorCode = e.getErrorCode().getCode();
            businessExceptionMetrics.record("desk.unlock", e);
            throw e;
        } catch (RuntimeException e) {
            result = MetricTagValues.RESULT_ERROR;
            errorCode = MetricTagValues.ERROR_CODE_INTERNAL;
            throw e;
        } finally {
            deskMetrics.recordUnlock(
                    System.nanoTime() - startNanos,
                    MetricTagValues.number(deskTemplateId),
                    result,
                    errorCode
            );
        }
    }

    @Override
    public void validateDeskUnlocked(Long userId, Long deskId) {
        if (!userDeskRepository.existsByUserIdAndDeskTemplate_Id(userId, deskId)) {
            throw new BusinessException(ErrorCode.DESK_NOT_FOUND);
        }
    }
}
