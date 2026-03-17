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
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GachaServiceImpl implements GachaService {

    // 기획에서 정의한 최대 카드 보관함 크기. 이번 단계는 soft-delete 되지 않은 카드만 센다.
    private static final int MAX_CARD_INVENTORY = 200;

    private final UserRepository userRepository;
    private final UserCardRepository userCardRepository;
    private final CardTemplateRepository cardTemplateRepository;
    private final FlyerGachaPolicy flyerGachaPolicy;
    private final GachaRandomProvider gachaRandomProvider;

    @Override
    @Transactional
    public GachaDrawResponse draw(Long userId, GachaDrawRequest request) {
        // 1. 요청값을 enum/허용 count로 고정해 이후 로직에서 switch 없이 안전하게 다룬다.
        GachaType type = parseType(request.getType());
        int count = validateCount(request.getCount());

        // 2. 1단계 구현 범위는 전단만 허용하고, 나머지 타입은 "존재하지만 아직 잠김"으로 응답한다.
        if (type != GachaType.FLYER) {
            throw new BusinessException(ErrorCode.GACHA_TYPE_LOCKED);
        }

        // 3. 먼저 인벤토리 여유를 확인해서 중간에 일부만 생성되는 상황을 막는다.
        long currentCardCount = userCardRepository.countActiveByUserId(userId);
        if (currentCardCount + count > MAX_CARD_INVENTORY) {
            throw new BusinessException(ErrorCode.GACHA_INVENTORY_FULL);
        }

        // 4. count별 비용을 정책 객체에서 계산하고, 유저 잔액이 충분한지 확인한다.
        long cost = flyerGachaPolicy.calculateCost(count);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.getGold() < cost) {
            throw new BusinessException(ErrorCode.GACHA_GOLD_INSUFFICIENT);
        }

        // 로그 적재는 아직 보류 상태라 users.gold만 직접 차감한다.
        user.spendGold(cost);

        // 5. count만큼 독립적인 뽑기를 수행해 새 UserCard 엔티티를 만든다.
        List<UserCard> drawnCards = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            drawnCards.add(createDrawnCard(userId));
        }

        // 6. 저장 직후 응답 DTO로 변환해, 프론트가 바로 카드 이미지를 그릴 수 있게 반환한다.
        List<GachaDrawCardResponse> cards = userCardRepository.saveAll(drawnCards).stream()
                .map(UserCard::toResponse)
                .map(GachaDrawCardResponse::from)
                .toList();

        return new GachaDrawResponse(type.name(), count, cost, user.getGold(), cards);
    }

    private GachaType parseType(String rawType) {
        try {
            // 요청값은 문자열로 들어오므로, 대소문자 차이는 서버에서 흡수한다.
            return GachaType.valueOf(rawType.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.GACHA_TYPE_INVALID);
        }
    }

    private int validateCount(Integer count) {
        // 기획서 기준 1회/10회 외 요청은 모두 가챠 도메인 에러로 거절한다.
        if (count == null || (count != 1 && count != 10)) {
            throw new BusinessException(ErrorCode.GACHA_INVALID_COUNT);
        }
        return count;
    }

    private UserCard createDrawnCard(Long userId) {
        // 전단 뽑기는 "등급 추첨 -> 그 등급 템플릿 선택" 2단계로 동작한다.
        CardGrade grade = flyerGachaPolicy.selectGrade(gachaRandomProvider.nextDouble());
        CardTemplate template = selectTemplate(grade);

        // 이번 단계 카드는 6개 포지션 중 3개만 가지며, 같은 포지션이 중복되지 않게 뽑는다.
        List<PositionType> positions = pickDistinctPositions(3);
        int minStat = flyerGachaPolicy.minStat(grade);
        int maxStat = flyerGachaPolicy.maxStat(grade);

        // 전단에서는 A/S가 나오지 않으므로 특수 능력은 항상 null, bonusValue도 0으로 시작한다.
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
        // 숨김/비활성/삭제 템플릿은 실제 가챠 풀에서 제외한다.
        List<CardTemplate> candidates = cardTemplateRepository
                .findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalse(grade);

        if (candidates.isEmpty()) {
            // 기획 데이터가 비어 있으면 조용히 대체하지 않고 즉시 실패시켜 데이터 누락을 드러낸다.
            throw new IllegalStateException("No drawable card template for grade " + grade);
        }

        // 같은 grade 안에서는 모든 카드가 동일 확률이다.
        return candidates.get(gachaRandomProvider.nextInt(candidates.size()));
    }

    private List<PositionType> pickDistinctPositions(int count) {
        // 후보 리스트에서 하나를 뽑을 때마다 제거해서 중복 없는 포지션 조합을 만든다.
        List<PositionType> candidates = new ArrayList<>(Arrays.asList(PositionType.values()));
        List<PositionType> selected = new ArrayList<>(count);

        for (int i = 0; i < count; i++) {
            int index = gachaRandomProvider.nextInt(candidates.size());
            selected.add(candidates.remove(index));
        }

        return selected;
    }

    private int nextStatValue(int min, int max) {
        // min/max 모두 포함하는 정수 범위에서 개별 스탯 값을 만든다.
        return min + gachaRandomProvider.nextInt(max - min + 1);
    }
}
