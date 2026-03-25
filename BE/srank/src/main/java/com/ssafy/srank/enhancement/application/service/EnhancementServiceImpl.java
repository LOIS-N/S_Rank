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
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EnhancementServiceImpl implements EnhancementService {

    private final UserCardService userCardService;
    private final UserService userService;
    private final ProbablyFairService probablyFairService;
    private final EnhancementLogFacade enhancementLogFacade;

    @Override
    public CursorPageResponse<UserCardResponse> getEnhancementCardList(Long userId, PositionType statType, SortType sortType, String cursorToken, int limit) {
        CursorPageResponse<UserCardResponse> result = userCardService.getUserCards(userId, statType, sortType, cursorToken, limit);
        List<UserCardResponse> cards = new ArrayList<>(result.cards());
        cards.removeIf((card)->card.enhanceTryCount() == 7);
        return new CursorPageResponse<>(cards, result.nextCursor(), result.hasMore(), cards.size() );
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
            int a = probablyFairService.roll(context,
                    request.getClientSeed(),
                    0,
                    ProbablyFairPurpose.of("ENHANCE_VALUE"),
                    policy.statIncrease+1);
            int b = probablyFairService.roll(context,
                    request.getClientSeed(),
                    0,
                    ProbablyFairPurpose.of("ENHANCE_VALUE"),
                    policy.statIncrease+1);
            int low = Math.min(a,b);
            int high = Math.max(a,b);

            return success(userId, request, userCardDetail, (long) policy.costGold, low, high-low, policy.statIncrease - high);
        }else{
            return fail(userId, request, userCardDetail, policy);
        }
    }

    private EnhanceResultResponse success(
            Long userId,
            EnhancementRequest request,
            UserCardResponse userCardDetail,
            Long gold,
            int statIncrease1,
            int statIncrease2,
            int statIncrease3
            ){
        userCardService.applyEnhanceSuccess(userId, request.getCardId(), statIncrease1, statIncrease2, statIncrease3);

        enhancementLogFacade.record(new EnhancementLogCommand(
                userId,
                request.getCardId(),
                userCardDetail.enhanceTryCount() + 1,
                true,
                userCardDetail.enhanceSuccessCount(),
                userCardDetail.enhanceSuccessCount() + 1,
                userCardDetail.skill1().skillType(),
                statIncrease1,
                userCardDetail.skill2().skillType(),
                statIncrease2,
                userCardDetail.skill3().skillType(),
                statIncrease3,
                gold,
                LocalDateTime.now()
        ));

        return EnhanceResultResponse.builder()
                .cardId(request.getCardId())
                .success(true)
                .enhanceTryCount(userCardDetail.enhanceTryCount()+1)
                .enhanceSuccessCount(userCardDetail.enhanceSuccessCount()+1)
                .increasedValue1(statIncrease1)
                .increasedValue2(statIncrease2)
                .increasedValue3(statIncrease3)
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
                .increasedValue1(0)
                .increasedValue2(0)
                .increasedValue3(0)
                .build();
    }
}
