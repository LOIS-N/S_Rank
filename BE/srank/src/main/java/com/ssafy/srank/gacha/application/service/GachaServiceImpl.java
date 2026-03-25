package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.blockchain.application.service.BlockchainRequestDispatchService;
import com.ssafy.srank.card.application.service.UserCardService;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.common.probablyfair.application.service.ProbablyFairService;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.gacha.application.dto.request.GachaDrawRequest;
import com.ssafy.srank.gacha.application.dto.request.GachaVerificationRequest;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawCardResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaProofResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaVerificationResponse;
import com.ssafy.srank.gacha.application.service.model.DrawContext;
import com.ssafy.srank.gacha.application.service.model.GachaProofMaterial;
import com.ssafy.srank.gacha.application.service.model.PreparedDraw;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.gacha.domain.policy.GachaPolicyRegistry;
import com.ssafy.srank.log.application.facade.GachaLogFacade;
import com.ssafy.srank.rabbitmq.blockchain.message.BlockchainRequestMessage;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.ranking.application.event.UserCardsChangedEvent;
import com.ssafy.srank.user.application.dto.response.MyGachaInfo;
import com.ssafy.srank.user.application.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GachaServiceImpl implements GachaService {

    private static final int MAX_CARD_INVENTORY = 200;

    private final UserService userService;
    private final UserCardService userCardService;
    private final GachaPolicyRegistry gachaPolicyRegistry;
    private final ProbablyFairService probablyFairService;
    private final GachaDrawPreparationService gachaDrawPreparationService;
    private final GachaDigestBuilder gachaDigestBuilder;
    private final GachaDrawLogCommandFactory gachaDrawLogCommandFactory;
    private final GachaLogFacade gachaLogFacade;
    private final BlockchainRequestDispatchService blockchainRequestDispatchService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public GachaDrawResponse draw(Long userId, GachaDrawRequest request) {
        // draw는 검증, 차감, 카드 준비, 저장, 로그, 응답 조립을 순서대로 오케스트레이션한다.
        DrawContext context = buildDrawContext(userId, request);
        spendGold(context);

        List<PreparedDraw> preparedDraws = gachaDrawPreparationService.createPreparedDraws(
                context.userId(),
                context.type(),
                context.clientSeed(),
                context.pfContext(),
                context.count()
        );
        List<UserCard> savedCards = saveCards(preparedDraws);
        eventPublisher.publishEvent(new UserCardsChangedEvent(userId));
        GachaProofMaterial proofMaterial = gachaDigestBuilder.build(
                context.type(),
                context.count(),
                context.clientSeed(),
                context.pfContext(),
                preparedDraws
        );

        recordDrawLog(context, savedCards, preparedDraws, proofMaterial);
        return buildDrawResponse(context, savedCards);
    }

    @Override
    public GachaVerificationResponse verify(GachaVerificationRequest request) {
        // verify는 저장 없이 draw와 동일한 PF 계산 경로를 다시 수행해 결과를 재연산한다.
        int count = validateCount(request.getCount());
        ProbablyFairContext pfContext = new ProbablyFairContext(
                request.getServerSeed().trim(),
                request.getAlgorithmVersion()
        );
        String clientSeed = request.getClientSeed().trim();

        List<PreparedDraw> preparedDraws = gachaDrawPreparationService.createPreparedDraws(
                null,
                request.getType(),
                clientSeed,
                pfContext,
                count
        );
        List<GachaDrawCardResponse> cards = preparedDraws.stream()
                .map(PreparedDraw::userCard)
                .map(UserCard::toResponse)
                .map(GachaDrawCardResponse::from)
                .toList();

        return new GachaVerificationResponse(
                cards,
                new GachaProofResponse(
                        pfContext.algorithmVersion(),
                        pfContext.serverSeed(),
                        clientSeed
                )
        );
    }

    private DrawContext buildDrawContext(Long userId, GachaDrawRequest request) {
        // 요청 정규화, 사용자 조회, 해금 여부, 인벤토리 한도, 비용 검증을 한 번에 묶는다.
        GachaType type = request.getType();
        int count = validateCount(request.getCount());
        String clientSeed = request.getClientSeed().trim();
        ProbablyFairContext pfContext = probablyFairService.issueContext();
        LocalDateTime requestedAt = LocalDateTime.now();

        MyGachaInfo myGachaInfo = userService.getMyGachaInfo(userId);

        gachaPolicyRegistry.validateUnlocked(type, myGachaInfo.getLevel());

        long currentCardCount = userCardService.countActiveCards(userId);
        if (currentCardCount + count > MAX_CARD_INVENTORY) {
            throw new BusinessException(ErrorCode.GACHA_INVENTORY_FULL);
        }

        long cost = gachaPolicyRegistry.calculateCost(type, count);
        if (myGachaInfo.getGold() < cost) {
            throw new BusinessException(ErrorCode.GACHA_GOLD_INSUFFICIENT);
        }

        String walletAddress = userService.getWalletAddress(userId);

        return new DrawContext(
                userId,
                walletAddress,
                type,
                count,
                clientSeed,
                pfContext,
                cost,
                requestedAt
        );
    }

    private void spendGold(DrawContext context) {
        userService.spendGold(
                context.userId(),
                context.cost(),
                GoldLogReason.GACHA_SPEND);
    }

    private List<UserCard> saveCards(List<PreparedDraw> preparedDraws) {
        // PF로 준비된 카드 엔티티만 일괄 저장한다.
        return userCardService.saveUserCards(preparedDraws.stream()
                .map(PreparedDraw::userCard)
                .toList());
    }

    private void recordDrawLog(
            DrawContext context,
            List<UserCard> savedCards,
            List<PreparedDraw> preparedDraws,
            GachaProofMaterial proofMaterial
    ) {
        // 저장 결과와 준비 과정의 proof를 합쳐 가챠 이력 로그 payload를 남긴다.
        List<Long> logIds = gachaLogFacade.recordDraw(gachaDrawLogCommandFactory.create(
                context.userId(),
                context.type(),
                context.count(),
                context.cost(),
                context.clientSeed(),
                context.pfContext(),
                proofMaterial.anchorPayload(),
                savedCards,
                preparedDraws,
                context.requestedAt()
        ));

        blockchainRequestDispatchService.dispatchAfterCommit(BlockchainRequestMessage.forGacha(
                logIds,
                context.walletAddress(),
                context.clientSeed(),
                context.pfContext().serverSeed(),
                context.count(),
                context.type()
        ));
    }

    private GachaDrawResponse buildDrawResponse(DrawContext context, List<UserCard> savedCards) {
        // 외부 응답은 저장된 카드와 최소 proof 정보만 노출한다.
        List<GachaDrawCardResponse> cards = savedCards.stream()
                .map(UserCard::toResponse)
                .map(GachaDrawCardResponse::from)
                .toList();

        return new GachaDrawResponse(
                cards,
                userService.getMyGachaInfo(context.userId()).getGold(),
                new GachaProofResponse(
                        context.pfContext().algorithmVersion(),
                        context.pfContext().serverSeed(),
                        context.clientSeed()
                )
        );
    }

    private int validateCount(Integer count) {
        // 현재 가챠는 1회와 10회만 허용한다.
        if (count == null || (count != 1 && count != 10)) {
            throw new BusinessException(ErrorCode.GACHA_INVALID_COUNT);
        }
        return count;
    }
}
