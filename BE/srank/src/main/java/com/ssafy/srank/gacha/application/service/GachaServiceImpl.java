package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.entity.SkillStat;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.repository.CardTemplateRepository;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.gacha.application.dto.request.GachaDrawRequest;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawCardResponse;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawResponse;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.gacha.domain.policy.FlyerGachaPolicy;
import com.ssafy.srank.gacha.domain.policy.GachaRandomProvider;
import com.ssafy.srank.log.application.command.GachaDrawLogCommand;
import com.ssafy.srank.log.application.command.GachaDrawnCardLogCommand;
import com.ssafy.srank.log.application.command.GoldLogCommand;
import com.ssafy.srank.log.application.facade.EconomyLogFacade;
import com.ssafy.srank.log.application.facade.GachaLogFacade;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GachaServiceImpl implements GachaService {

    private static final int MAX_CARD_INVENTORY = 200;

    private final UserRepository userRepository;
    private final UserCardRepository userCardRepository;
    private final CardTemplateRepository cardTemplateRepository;
    private final FlyerGachaPolicy flyerGachaPolicy;
    private final GachaRandomProvider gachaRandomProvider;
    private final EconomyLogFacade economyLogFacade;
    private final GachaLogFacade gachaLogFacade;

    @Override
    @Transactional
    public GachaDrawResponse draw(Long userId, GachaDrawRequest request) {
        GachaType type = request.getType();
        int count = validateCount(request.getCount());

        if (type != GachaType.FLYER) {
            throw new BusinessException(ErrorCode.GACHA_TYPE_LOCKED);
        }

        long currentCardCount = userCardRepository.countActiveByUserId(userId);
        if (currentCardCount + count > MAX_CARD_INVENTORY) {
            throw new BusinessException(ErrorCode.GACHA_INVENTORY_FULL);
        }

        long cost = flyerGachaPolicy.calculateCost(count);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.getGold() < cost) {
            throw new BusinessException(ErrorCode.GACHA_GOLD_INSUFFICIENT);
        }

        user.spendGold(cost);
        economyLogFacade.recordGoldChange(new GoldLogCommand(
                userId,
                -cost,
                user.getGold(),
                GoldLogReason.GACHA_SPEND,
                LocalDateTime.now()
        ));

        List<UserCard> drawnCards = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            drawnCards.add(createDrawnCard(userId));
        }

        List<UserCard> savedCards = userCardRepository.saveAll(drawnCards);
        gachaLogFacade.recordDraw(new GachaDrawLogCommand(
                userId,
                type,
                count,
                cost,
                false,
                savedCards.stream()
                        .map(this::toGachaDrawnCardLogCommand)
                        .toList(),
                LocalDateTime.now()
        ));

        List<GachaDrawCardResponse> cards = savedCards.stream()
                .map(UserCard::toResponse)
                .map(GachaDrawCardResponse::from)
                .toList();

        return new GachaDrawResponse(type.name(), count, cost, user.getGold(), cards);
    }

    private int validateCount(Integer count) {
        if (count == null || (count != 1 && count != 10)) {
            throw new BusinessException(ErrorCode.GACHA_INVALID_COUNT);
        }
        return count;
    }

    private UserCard createDrawnCard(Long userId) {
        CardGrade grade = flyerGachaPolicy.selectGrade(gachaRandomProvider.nextDouble());
        CardTemplate template = selectTemplate(grade);

        List<PositionType> positions = pickDistinctPositions(3);
        int minStat = flyerGachaPolicy.minStat(grade);
        int maxStat = flyerGachaPolicy.maxStat(grade);

        return UserCard.builder()
                .userId(userId)
                .cardTemplate(template)
                .specialSkillTemplate(null)
                .stat1(new SkillStat(positions.get(0), nextStatValue(minStat, maxStat), 0))
                .stat2(new SkillStat(positions.get(1), nextStatValue(minStat, maxStat), 0))
                .stat3(new SkillStat(positions.get(2), nextStatValue(minStat, maxStat), 0))
                .enhanceTryCount(0)
                .enhanceSuccessCount(0)
                .build();
    }

    private CardTemplate selectTemplate(CardGrade grade) {
        List<CardTemplate> candidates = cardTemplateRepository
                .findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalse(grade);

        if (candidates.isEmpty()) {
            throw new IllegalStateException("No drawable card template for grade " + grade);
        }

        return candidates.get(gachaRandomProvider.nextInt(candidates.size()));
    }

    private List<PositionType> pickDistinctPositions(int count) {
        List<PositionType> candidates = new ArrayList<>(Arrays.asList(PositionType.values()));
        List<PositionType> selected = new ArrayList<>(count);

        for (int i = 0; i < count; i++) {
            int index = gachaRandomProvider.nextInt(candidates.size());
            selected.add(candidates.remove(index));
        }

        return selected;
    }

    private int nextStatValue(int min, int max) {
        return min + gachaRandomProvider.nextInt(max - min + 1);
    }

    private GachaDrawnCardLogCommand toGachaDrawnCardLogCommand(UserCard userCard) {
        return new GachaDrawnCardLogCommand(
                userCard.getId(),
                userCard.getCardTemplate().getGrade(),
                userCard.getStat1().getSkillType().name(),
                userCard.getStat1().getTotalValue(),
                userCard.getStat2().getSkillType().name(),
                userCard.getStat2().getTotalValue(),
                userCard.getStat3().getSkillType().name(),
                userCard.getStat3().getTotalValue(),
                userCard.getSpecialSkillTemplate() == null ? null : userCard.getSpecialSkillTemplate().getSkillCode()
        );
    }
}
