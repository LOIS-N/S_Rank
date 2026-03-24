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
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EnhancementServiceImpl implements EnhancementService {

    private final UserCardService userCardService;
    private final UserService userService;
    private final ProbablyFairService probablyFairService;

    @Override
    public CursorPageResponse<UserCardResponse> getEnhancementCardList(Long userId, PositionType statType, SortType sortType, String cursorToken, int limit) {
        return userCardService.getUserCards(userId, statType, sortType, cursorToken, limit);
    }

    @Transactional
    @Override
    public EnhanceResultResponse enhanceCard(Long userId, EnhancementRequest request) {
        UserCardResponse userCardDetail = userCardService.getUserCardDetail(userId, request.getCardId());
        if(userCardDetail.enhanceTryCount() >= EnhancePolicy.MAX_ENHANCE_LEVEL) throw new BusinessException(ErrorCode.ENHANCE_NO_ATTEMPTS_LEFT);
        userService.spendGold(userId, (long) EnhancePolicy.Grade.valueOf(userCardDetail.grade()).costGold, GoldLogReason.ENHANCE_SPEND);

        //강화 시작
        ProbablyFairContext context = probablyFairService.issueContext();
        int enhanceResult = probablyFairService.roll(context,
                request.getClientSeed(),
                0,
                ProbablyFairPurpose.of("ENHANCE_RESULT"),
                100);
        if(enhanceResult < EnhancePolicy.Grade.valueOf(userCardDetail.grade()).successRate){ //성공
            userCardService.applyEnhanceSuccess(userId, request.getCardId(), EnhancePolicy.Grade.valueOf(userCardDetail.grade()).statIncrease);
            return EnhanceResultResponse.builder()
                    .cardId(request.getCardId())
                    .success(true)
                    .enhanceTryCount(userCardDetail.enhanceTryCount()+1)
                    .enhanceSuccessCount(userCardDetail.enhanceSuccessCount()+1)
                    .increasedValue(EnhancePolicy.Grade.valueOf(userCardDetail.grade()).statIncrease)
                    .build();
        }else{
            userCardService.applyEnhanceFail(userId, request.getCardId());
            return EnhanceResultResponse.builder()
                    .cardId(request.getCardId())
                    .success(false)
                    .enhanceTryCount(userCardDetail.enhanceTryCount()+1)
                    .enhanceSuccessCount(userCardDetail.enhanceSuccessCount())
                    .increasedValue(0)
                    .build();
        }
    }

}
