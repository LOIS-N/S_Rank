package com.ssafy.srank.enhancement.application.service;

import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.application.service.UserCardService;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.SortType;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.probablyfair.application.service.ProbablyFairService;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairPurpose;
import com.ssafy.srank.enhancement.application.dto.request.EnhancementRequest;
import com.ssafy.srank.enhancement.application.dto.response.EnhanceResultResponse;
import com.ssafy.srank.enhancement.domain.policy.EnhancePolicy;
import com.ssafy.srank.log.application.command.EnhancementLogCommand;
import com.ssafy.srank.log.application.facade.EnhancementLogFacade;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EnhancementServiceImpl implements EnhancementService {

    private final UserCardService userCardService;
    private final UserService userService;
    private final ProbablyFairService probablyFairService;
    private final EnhancementLogFacade enhancementLogFacade;

    @Override
    public CursorPageResponse<UserCardResponse> getEnhancementCardList(Long userId, PositionType statType, SortType sortType, String cursorToken, int limit) {
        return userCardService.getUserCards(userId, statType, sortType, cursorToken, limit);
    }

    @Transactional
    @Override
    public EnhanceResultResponse enhanceCard(Long userId, EnhancementRequest request) {
        UserCardResponse userCardDetail = userCardService.getUserCardDetail(userId, request.getCardId());
        EnhancePolicy.Grade policy = EnhancePolicy.Grade.valueOf(userCardDetail.grade());

        if(userCardDetail.enhanceTryCount() >= EnhancePolicy.MAX_ENHANCE_LEVEL) throw new BusinessException(ErrorCode.ENHANCE_NO_ATTEMPTS_LEFT);
        userService.spendGold(userId, (long) policy.costGold, GoldLogReason.ENHANCE_SPEND);

        //강화 시작
        ProbablyFairContext context = probablyFairService.issueContext();
        int enhanceResult = probablyFairService.roll(context,
                request.getClientSeed(),
                0,
                ProbablyFairPurpose.of("ENHANCE_RESULT"),
                100);
        if(enhanceResult < policy.successRate){ //성공
            return success(userId, request, userCardDetail, policy);
        }else{
            return fail(userId, request, userCardDetail, policy);
        }
    }

    private EnhanceResultResponse success(Long userId, EnhancementRequest request, UserCardResponse userCardDetail, EnhancePolicy.Grade policy){
        userCardService.applyEnhanceSuccess(userId, request.getCardId(), EnhancePolicy.Grade.valueOf(userCardDetail.grade()).statIncrease);

        enhancementLogFacade.record(new EnhancementLogCommand(
                userId,
                request.getCardId(),
                userCardDetail.enhanceTryCount() + 1,
                true,
                userCardDetail.enhanceSuccessCount(),
                userCardDetail.enhanceSuccessCount() + 1,
                userCardDetail.skill1().skillType(),
                policy.statIncrease,
                userCardDetail.skill2().skillType(),
                policy.statIncrease,
                userCardDetail.skill3().skillType(),
                policy.statIncrease,
                policy.costGold,
                LocalDateTime.now()
        ));

        return EnhanceResultResponse.builder()
                .cardId(request.getCardId())
                .success(true)
                .enhanceTryCount(userCardDetail.enhanceTryCount()+1)
                .enhanceSuccessCount(userCardDetail.enhanceSuccessCount()+1)
                .increasedValue(EnhancePolicy.Grade.valueOf(userCardDetail.grade()).statIncrease)
                .build();
    }

    private EnhanceResultResponse fail(Long userId, EnhancementRequest request, UserCardResponse userCardDetail, EnhancePolicy.Grade policy){
        userCardService.applyEnhanceFail(userId, request.getCardId());
        enhancementLogFacade.record(new EnhancementLogCommand(
                userId,
                request.getCardId(),
                userCardDetail.enhanceTryCount() + 1,
                false,
                userCardDetail.enhanceSuccessCount(),
                userCardDetail.enhanceSuccessCount(),
                userCardDetail.skill1().skillType(),
                0,
                userCardDetail.skill2().skillType(),
                0,
                userCardDetail.skill3().skillType(),
                0,
                policy.costGold,
                LocalDateTime.now()
        ));
        return EnhanceResultResponse.builder()
                .cardId(request.getCardId())
                .success(false)
                .enhanceTryCount(userCardDetail.enhanceTryCount()+1)
                .enhanceSuccessCount(userCardDetail.enhanceSuccessCount())
                .increasedValue(0)
                .build();
    }
}
