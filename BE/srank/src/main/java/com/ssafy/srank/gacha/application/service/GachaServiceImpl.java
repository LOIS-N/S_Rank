package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.entity.SkillStat;
import com.ssafy.srank.card.domain.entity.SpecialSkillEffect;
import com.ssafy.srank.card.domain.entity.SpecialSkillTemplate;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.domain.enums.ConditionType;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.repository.CardTemplateRepository;
import com.ssafy.srank.card.repository.SpecialSkillTemplateRepository;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.gacha.application.dto.request.GachaDrawRequest;
import com.ssafy.srank.gacha.application.dto.request.GachaVerificationRequest;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawCardResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawProofItemResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaProofResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaVerificationResponse;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.gacha.domain.enums.RollPurpose;
import com.ssafy.srank.gacha.domain.policy.AnchorPayloadFactory;
import com.ssafy.srank.gacha.domain.policy.FlyerGachaPolicy;
import com.ssafy.srank.gacha.domain.policy.GachaPolicyRegistry;
import com.ssafy.srank.gacha.domain.policy.GachaRandomProvider;
import com.ssafy.srank.gacha.domain.policy.ProvablyFairCalculator;
import com.ssafy.srank.gacha.domain.policy.ProvablyFairContext;
import com.ssafy.srank.gacha.domain.policy.ProvablyFairContextFactory;
import com.ssafy.srank.log.application.command.GachaDrawLogCommand;
import com.ssafy.srank.log.application.command.GachaDrawnCardLogCommand;
import com.ssafy.srank.log.application.command.GoldLogCommand;
import com.ssafy.srank.log.application.facade.EconomyLogFacade;
import com.ssafy.srank.log.application.facade.GachaLogFacade;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GachaServiceImpl implements GachaService {

    private static final int MAX_CARD_INVENTORY = 200;

    private final UserRepository userRepository;
    private final UserCardRepository userCardRepository;
    private final CardTemplateRepository cardTemplateRepository;
    private final SpecialSkillTemplateRepository specialSkillTemplateRepository;
    private final GachaPolicyRegistry gachaPolicyRegistry;
    private final ProvablyFairContextFactory provablyFairContextFactory;
    private final ProvablyFairCalculator provablyFairCalculator;
    private final AnchorPayloadFactory anchorPayloadFactory;

    /**
     * 구버전 전단 RNG 흐름 보존용 의존성이다.
     * 현재 요청 경로에서는 Provably Fair 구현만 사용한다.
     */
    private final FlyerGachaPolicy flyerGachaPolicy;

    /**
     * 구버전 서버 RNG 흐름 보존용 의존성이다.
     * 현재 요청 경로에서는 Provably Fair 구현만 사용한다.
     */
    private final GachaRandomProvider gachaRandomProvider;
    private final EconomyLogFacade economyLogFacade;
    private final GachaLogFacade gachaLogFacade;

    @Override
    @Transactional
    public GachaDrawResponse draw(Long userId, GachaDrawRequest request) {
        GachaType type = request.getType();
        int count = validateCount(request.getCount());
        String clientSeed = request.getClientSeed().trim();
        ProvablyFairContext pfContext = provablyFairContextFactory.create();
        LocalDateTime requestedAt = LocalDateTime.now();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 타입 해금 여부를 먼저 확인해 잠긴 뽑기에 대해 불필요한 계산과 차감을 막는다.
        gachaPolicyRegistry.validateUnlocked(type, user.getLevel());

        long currentCardCount = userCardRepository.countActiveByUserId(userId);
        if (currentCardCount + count > MAX_CARD_INVENTORY) {
            throw new BusinessException(ErrorCode.GACHA_INVENTORY_FULL);
        }

        long cost = gachaPolicyRegistry.calculateCost(type, count);

        if (user.getGold() < cost) {
            throw new BusinessException(ErrorCode.GACHA_GOLD_INSUFFICIENT);
        }

        // 차감과 로그는 실제로 결과를 생성하기 직전에 수행해 검증 이후 데이터만 남기게 한다.
        user.spendGold(cost);
        economyLogFacade.recordGoldChange(new GoldLogCommand(
                userId,
                -cost,
                user.getGold(),
                GoldLogReason.GACHA_SPEND,
                requestedAt
        ));

        List<PreparedDraw> preparedDraws = createPreparedDraws(userId, type, clientSeed, pfContext, count);

        List<UserCard> savedCards = userCardRepository.saveAll(preparedDraws.stream()
                .map(PreparedDraw::userCard)
                .toList());

        List<GachaDrawProofItemResponse> proofItems = preparedDraws.stream()
                .map(PreparedDraw::proofItem)
                .toList();
        String resultDigest = buildResultDigest(type, count, proofItems, preparedDraws);
        String anchorPayload = anchorPayloadFactory.createAnchorPayload(
                pfContext.requestId(),
                pfContext.serverSeedHash(),
                pfContext.serverSeed(),
                type,
                count,
                clientSeed,
                resultDigest,
                proofItems
        );

        gachaLogFacade.recordDraw(new GachaDrawLogCommand(
                pfContext.requestId(),
                userId,
                type,
                count,
                cost,
                clientSeed,
                pfContext.serverSeedHash(),
                pfContext.serverSeed(),
                pfContext.requestNonce(),
                pfContext.algorithmVersion(),
                anchorPayload,
                BlockchainStatus.NOT_REQUESTED,
                null,
                false,
                buildLogCommands(savedCards, preparedDraws),
                requestedAt
        ));

        List<GachaDrawCardResponse> cards = savedCards.stream()
                .map(UserCard::toResponse)
                .map(GachaDrawCardResponse::from)
                .toList();
        GachaProofResponse proof = new GachaProofResponse(
                pfContext.requestId(),
                pfContext.algorithmVersion(),
                pfContext.serverSeedHash(),
                pfContext.serverSeed(),
                clientSeed,
                pfContext.requestNonce(),
                resultDigest,
                proofItems
        );
        String nextCursor = savedCards.isEmpty() ? null : encodeCursor(savedCards.get(savedCards.size() - 1));
        boolean hasMore = userCardRepository.countActiveByUserId(userId) > savedCards.size();

        return new GachaDrawResponse(
                cards,
                nextCursor,
                hasMore,
                type,
                count,
                cost,
                user.getGold(),
                proof,
                BlockchainStatus.NOT_REQUESTED
        );
    }

    @Override
    public GachaVerificationResponse verify(GachaVerificationRequest request) {
        int count = validateCount(request.getCount());
        ProvablyFairContext pfContext = new ProvablyFairContext(
                request.getRequestId().trim(),
                request.getRevealedServerSeed().trim(),
                request.getServerSeedHash().trim(),
                request.getRequestNonce().trim(),
                request.getAlgorithmVersion()
        );
        String clientSeed = request.getClientSeed().trim();
        boolean serverSeedHashVerified = provablyFairCalculator.sha256Hex(pfContext.serverSeed())
                .equalsIgnoreCase(pfContext.serverSeedHash());

        List<PreparedDraw> preparedDraws = createPreparedDraws(null, request.getType(), clientSeed, pfContext, count);
        List<GachaDrawProofItemResponse> proofItems = preparedDraws.stream()
                .map(PreparedDraw::proofItem)
                .toList();
        String resultDigest = buildResultDigest(request.getType(), count, proofItems, preparedDraws);
        GachaProofResponse proof = new GachaProofResponse(
                pfContext.requestId(),
                pfContext.algorithmVersion(),
                pfContext.serverSeedHash(),
                pfContext.serverSeed(),
                clientSeed,
                pfContext.requestNonce(),
                resultDigest,
                proofItems
        );

        List<GachaDrawCardResponse> cards = preparedDraws.stream()
                .map(PreparedDraw::userCard)
                .map(UserCard::toResponse)
                .map(GachaDrawCardResponse::from)
                .toList();

        return new GachaVerificationResponse(
                cards,
                null,
                false,
                request.getType(),
                count,
                proof,
                serverSeedHashVerified
        );
    }

    private int validateCount(Integer count) {
        if (count == null || (count != 1 && count != 10)) {
            throw new BusinessException(ErrorCode.GACHA_INVALID_COUNT);
        }
        return count;
    }

    private List<PreparedDraw> createPreparedDraws(
            Long userId,
            GachaType type,
            String clientSeed,
            ProvablyFairContext pfContext,
            int count
    ) {
        List<PreparedDraw> preparedDraws = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            preparedDraws.add(createPreparedDraw(userId, type, clientSeed, pfContext, i));
        }
        return preparedDraws;
    }

    /**
     * 등급 -> 템플릿 -> 특수능력 순서를 고정해 프론트가 같은 입력으로 동일 결과를 재계산할 수 있게 한다.
     */
    private PreparedDraw createPreparedDraw(
            Long userId,
            GachaType type,
            String clientSeed,
            ProvablyFairContext pfContext,
            int drawIndex
    ) {
        int gradeRoll = provablyFairCalculator.roll(
                pfContext.serverSeed(),
                clientSeed,
                pfContext.requestNonce(),
                drawIndex,
                RollPurpose.GRADE.key(),
                gachaPolicyRegistry.getRollBound()
        );
        CardGrade grade = gachaPolicyRegistry.selectGrade(type, gradeRoll);
        TemplateSelection templateSelection = selectTemplate(type, grade, clientSeed, pfContext, drawIndex);
        CardTemplate template = templateSelection.template();
        List<PositionType> positions = pickDistinctPositions(clientSeed, pfContext, drawIndex);
        SpecialSkillSelection skillSelection = selectSpecialSkill(grade, positions, clientSeed, pfContext, drawIndex);
        int minStat = gachaPolicyRegistry.minStat(grade);
        int maxStat = gachaPolicyRegistry.maxStat(grade);

        UserCard userCard = UserCard.builder()
                .userId(userId)
                .cardTemplate(template)
                .specialSkillTemplate(skillSelection.specialSkillTemplate())
                .stat1(new SkillStat(positions.get(0), nextStatValue(clientSeed, pfContext, drawIndex, 1, minStat, maxStat), 0))
                .stat2(new SkillStat(positions.get(1), nextStatValue(clientSeed, pfContext, drawIndex, 2, minStat, maxStat), 0))
                .stat3(new SkillStat(positions.get(2), nextStatValue(clientSeed, pfContext, drawIndex, 3, minStat, maxStat), 0))
                .enhanceTryCount(0)
                .enhanceSuccessCount(0)
                .build();

        return new PreparedDraw(
                userCard,
                new GachaDrawProofItemResponse(
                        drawIndex,
                        gradeRoll,
                        templateSelection.templateRoll(),
                        skillSelection.skillRoll(),
                        grade,
                        template.getId(),
                        skillSelection.specialSkillTemplate() == null
                                ? null
                                : skillSelection.specialSkillTemplate().getSkillCode()
                )
        );
    }

    private TemplateSelection selectTemplate(
            GachaType type,
            CardGrade grade,
            String clientSeed,
            ProvablyFairContext pfContext,
            int drawIndex
    ) {
        List<CardTemplate> candidates = cardTemplateRepository
                .findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalseOrderByIdAsc(grade);

        if (candidates.isEmpty()) {
            throw new IllegalStateException("No drawable card template for grade " + grade);
        }

        // 템플릿 후보를 ID 순으로 고정 정렬해 검증 시 동일한 카드가 선택되게 한다.
        int templateRoll = provablyFairCalculator.roll(
                pfContext.serverSeed(),
                clientSeed,
                pfContext.requestNonce(),
                drawIndex,
                RollPurpose.TEMPLATE.key(type.name() + "_" + grade.name()),
                candidates.size()
        );
        return new TemplateSelection(candidates.get(templateRoll), templateRoll);
    }

    /**
     * 3개 스탯 포지션도 결정형으로 뽑아야 카드 결과 전체를 재현할 수 있다.
     */
    private List<PositionType> pickDistinctPositions(
            String clientSeed,
            ProvablyFairContext pfContext,
            int drawIndex
    ) {
        int count = 3;
        List<PositionType> candidates = new ArrayList<>(Arrays.asList(PositionType.values()));
        List<PositionType> selected = new ArrayList<>(count);

        for (int i = 0; i < count; i++) {
            int index = provablyFairCalculator.roll(
                    pfContext.serverSeed(),
                    clientSeed,
                    pfContext.requestNonce(),
                    drawIndex,
                    RollPurpose.POSITION.key(i + 1),
                    candidates.size()
            );
            selected.add(candidates.remove(index));
        }

        return selected;
    }

    private int nextStatValue(
            String clientSeed,
            ProvablyFairContext pfContext,
            int drawIndex,
            int statIndex,
            int min,
            int max
    ) {
        int range = max - min + 1;
        int statRoll = provablyFairCalculator.roll(
                pfContext.serverSeed(),
                clientSeed,
                pfContext.requestNonce(),
                drawIndex,
                RollPurpose.STAT.key(statIndex),
                range
        );
        return min + statRoll;
    }

    private SpecialSkillSelection selectSpecialSkill(
            CardGrade grade,
            List<PositionType> positions,
            String clientSeed,
            ProvablyFairContext pfContext,
            int drawIndex
    ) {
        if (grade != CardGrade.S) {
            return new SpecialSkillSelection(null, null);
        }

        List<SpecialSkillTemplate> candidates = specialSkillTemplateRepository.findAllByActiveTrueAndDeletedFalseOrderByIdAsc()
                .stream()
                .filter(skill -> isEligibleForPositions(skill, positions))
                .sorted(Comparator.comparing(SpecialSkillTemplate::getId))
                .toList();

        if (candidates.isEmpty()) {
            throw new IllegalStateException("No drawable special skill for S grade");
        }

        int skillRoll = provablyFairCalculator.roll(
                pfContext.serverSeed(),
                clientSeed,
                pfContext.requestNonce(),
                drawIndex,
                RollPurpose.SKILL.key(),
                candidates.size()
        );

        return new SpecialSkillSelection(candidates.get(skillRoll), skillRoll);
    }

    private boolean isEligibleForPositions(SpecialSkillTemplate skillTemplate, List<PositionType> positions) {
        Set<PositionType> referencedPositions = new HashSet<>();
        for (SpecialSkillEffect effect : skillTemplate.getEffects()) {
            if (effect.getConditionPosition() != null) {
                referencedPositions.add(effect.getConditionPosition());
            }
            if (effect.getTargetPosition() != null) {
                referencedPositions.add(effect.getTargetPosition());
            }
            if (effect.getConditionType() == ConditionType.WHEN_ASSIGNED_TO_POSITION && effect.getConditionPosition() != null) {
                referencedPositions.add(effect.getConditionPosition());
            }
        }

        if (referencedPositions.isEmpty()) {
            return true;
        }

        return positions.stream().anyMatch(referencedPositions::contains);
    }

    private String buildResultDigest(
            GachaType type,
            int count,
            List<GachaDrawProofItemResponse> proofItems,
            List<PreparedDraw> preparedDraws
    ) {
        StringBuilder builder = new StringBuilder(type.name())
                .append(':')
                .append(count);

        for (int i = 0; i < preparedDraws.size(); i++) {
            PreparedDraw draw = preparedDraws.get(i);
            GachaDrawProofItemResponse proofItem = proofItems.get(i);
            builder.append('|')
                    .append(proofItem.drawIndex())
                    .append(':')
                    .append(proofItem.selectedGrade())
                    .append(':')
                    .append(proofItem.selectedTemplateId())
                    .append(':')
                    .append(draw.userCard().getStat1().getSkillType())
                    .append(':')
                    .append(draw.userCard().getStat1().getTotalValue())
                    .append(':')
                    .append(draw.userCard().getStat2().getSkillType())
                    .append(':')
                    .append(draw.userCard().getStat2().getTotalValue())
                    .append(':')
                    .append(draw.userCard().getStat3().getSkillType())
                    .append(':')
                    .append(draw.userCard().getStat3().getTotalValue())
                    .append(':')
                    .append(proofItem.selectedSpecialSkillCode());
        }

        return provablyFairCalculator.sha256Hex(builder.toString());
    }

    private List<GachaDrawnCardLogCommand> buildLogCommands(List<UserCard> savedCards, List<PreparedDraw> preparedDraws) {
        List<GachaDrawnCardLogCommand> commands = new ArrayList<>(savedCards.size());
        for (int i = 0; i < savedCards.size(); i++) {
            commands.add(toGachaDrawnCardLogCommand(savedCards.get(i), preparedDraws.get(i).proofItem()));
        }
        return commands;
    }

    private GachaDrawnCardLogCommand toGachaDrawnCardLogCommand(UserCard userCard, GachaDrawProofItemResponse proofItem) {
        return new GachaDrawnCardLogCommand(
                proofItem.drawIndex(),
                proofItem.gradeRoll(),
                proofItem.templateRoll(),
                proofItem.skillRoll(),
                userCard.getId(),
                userCard.getCardTemplate().getGrade(),
                userCard.getCardTemplate().getId(),
                userCard.getStat1().getSkillType().name(),
                userCard.getStat1().getTotalValue(),
                userCard.getStat2().getSkillType().name(),
                userCard.getStat2().getTotalValue(),
                userCard.getStat3().getSkillType().name(),
                userCard.getStat3().getTotalValue(),
                userCard.getSpecialSkillTemplate() == null ? null : userCard.getSpecialSkillTemplate().getSkillCode()
        );
    }

    private String encodeCursor(UserCard card) {
        int gradePriority = toGradePriority(card.getCardTemplate().getGrade());
        int totalStat = card.getStat1().getTotalValue()
                + card.getStat2().getTotalValue()
                + card.getStat3().getTotalValue();
        String raw = gradePriority + ":" + totalStat + ":" + card.getId();
        return Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private int toGradePriority(CardGrade grade) {
        return switch (grade) {
            case S -> 5;
            case A -> 4;
            case B -> 3;
            case C -> 2;
            case D -> 1;
        };
    }

    /**
     * 구버전 RNG 기반 카드 생성 메서드다.
     * 현재 요청 경로에서는 사용하지 않으며, 향후 이전 정책 비교가 필요할 때만 참고한다.
     */
    @Deprecated(forRemoval = false)
    private UserCard createLegacyDrawnCard(Long userId) {
        CardGrade grade = flyerGachaPolicy.selectGrade(gachaRandomProvider.nextDouble());
        CardTemplate template = selectLegacyTemplate(grade);

        List<PositionType> positions = pickLegacyDistinctPositions(3);
        int minStat = flyerGachaPolicy.minStat(grade);
        int maxStat = flyerGachaPolicy.maxStat(grade);

        return UserCard.builder()
                .userId(userId)
                .cardTemplate(template)
                .specialSkillTemplate(null)
                .stat1(new SkillStat(positions.get(0), legacyStatValue(minStat, maxStat), 0))
                .stat2(new SkillStat(positions.get(1), legacyStatValue(minStat, maxStat), 0))
                .stat3(new SkillStat(positions.get(2), legacyStatValue(minStat, maxStat), 0))
                .enhanceTryCount(0)
                .enhanceSuccessCount(0)
                .build();
    }

    @Deprecated(forRemoval = false)
    private CardTemplate selectLegacyTemplate(CardGrade grade) {
        List<CardTemplate> candidates = cardTemplateRepository
                .findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalse(grade);

        if (candidates.isEmpty()) {
            throw new IllegalStateException("No drawable card template for grade " + grade);
        }

        return candidates.get(gachaRandomProvider.nextInt(candidates.size()));
    }

    @Deprecated(forRemoval = false)
    private List<PositionType> pickLegacyDistinctPositions(int count) {
        List<PositionType> candidates = new ArrayList<>(Arrays.asList(PositionType.values()));
        List<PositionType> selected = new ArrayList<>(count);

        for (int i = 0; i < count; i++) {
            int index = gachaRandomProvider.nextInt(candidates.size());
            selected.add(candidates.remove(index));
        }

        return selected;
    }

    @Deprecated(forRemoval = false)
    private int legacyStatValue(int min, int max) {
        return min + gachaRandomProvider.nextInt(max - min + 1);
    }

    private record PreparedDraw(
            UserCard userCard,
            GachaDrawProofItemResponse proofItem
    ) {
    }

    private record TemplateSelection(
            CardTemplate template,
            int templateRoll
    ) {
    }

    private record SpecialSkillSelection(
            SpecialSkillTemplate specialSkillTemplate,
            Integer skillRoll
    ) {
    }
}
