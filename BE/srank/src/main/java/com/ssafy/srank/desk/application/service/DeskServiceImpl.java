package com.ssafy.srank.desk.application.service;

import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.desk.application.dto.response.DeskTemplateResponse;
import com.ssafy.srank.desk.domain.entity.DeskTemplate;
import com.ssafy.srank.desk.domain.entity.UserDesk;
import com.ssafy.srank.desk.repository.DeskTemplateRepository;
import com.ssafy.srank.desk.repository.UserDeskRepository;
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
        // 1. 템플릿 존재 확인
        DeskTemplate template = deskTemplateRepository.findById(deskTemplateId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DESK_NOT_FOUND));

        // 2. 이미 해금 여부 확인
        if (userDeskRepository.existsByUserIdAndDeskTemplate_Id(userId, deskTemplateId)) {
            throw new BusinessException(ErrorCode.DESK_ALREADY_UNLOCKED);
        }

        // 3. 레벨 검증 (도메인 위임)
        // Todo : 사용자 userLevel 가져오기
        int userLevel = 1;
        if (!template.isUnlockable(userLevel)) {
            throw new BusinessException(ErrorCode.DESK_INSUFFICIENT_LEVEL);
        }

        // 4. 골드 차감은 유저 도메인 구현 후 추가 예정

        // 5. 해금
        userDeskRepository.save(UserDesk.builder()
                .userId(userId)
                .deskTemplate(template)
                .build());
    }
}
